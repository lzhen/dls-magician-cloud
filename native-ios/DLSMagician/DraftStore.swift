import Foundation
import CryptoKit
import Combine

struct DraftStore {
    var rootOverride: URL? = nil
    private func file(userID: String, projectID: String) throws -> URL {
        var root = try rootOverride ?? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("WorkflowDrafts", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true,
                                               attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try root.setResourceValues(values)
        let key = SHA256.hash(data: Data("\(userID):\(projectID)".utf8)).map { String(format: "%02x", $0) }.joined()
        return root.appendingPathComponent(key + ".json")
    }
    func load(userID: String, projectID: String) throws -> WorkflowDraft? {
        let url = try file(userID: userID, projectID: projectID)
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        let draft = try JSONDecoder().decode(WorkflowDraft.self, from: Data(contentsOf: url))
        guard draft.userID == userID, draft.projectID == projectID else { throw AppFailure.storage }
        return draft
    }
    func save(_ draft: WorkflowDraft) throws {
        try JSONEncoder().encode(draft).write(to: file(userID: draft.userID, projectID: draft.projectID),
                                               options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    func remove(userID: String, projectID: String) throws {
        let url = try file(userID: userID, projectID: projectID)
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
}

@MainActor
final class EditorModel: ObservableObject {
    @Published private(set) var project: ProjectDetail?
    @Published var text = ""
    @Published var error: String?
    @Published private(set) var saving = false
    @Published private(set) var loading = false
    @Published var restoredDraft = false
    @Published var saved = false
    @Published private(set) var hasConflict = false
    @Published private(set) var collaborating = false
    @Published private(set) var collaborationNeedsRefresh = false
    @Published private(set) var recoveryProject: ProjectDetail?
    @Published var snapshot: PrototypeSnapshot?
    @Published var system: PrototypeSystem
    private let drafts: DraftStore
    private let preferences: UserDefaults
    private var draftBase: String?
    let projectID: String
    let userID: String
    var dirty: Bool { project.map { text != $0.structuredLanguage } ?? false }
    var editable: Bool { project?.canEdit(userID: userID) == true }
    var role: String { project?.role(for: userID) ?? "Viewer" }
    var busy: Bool { loading || saving || collaborating }
    var canComment: Bool { project.map { CollaborationPolicy.canComment(project: $0, userID: userID) } ?? false }

    init(projectID: String, userID: String, drafts: DraftStore = DraftStore(), preferences: UserDefaults = .standard) {
        self.projectID = projectID; self.userID = userID; self.drafts = drafts; self.preferences = preferences
        system = PrototypeSystem(rawValue: preferences.string(forKey: PrototypeSystem.key(userID: userID, projectID: projectID)) ?? "") ?? .dls
    }
    func selectSystem(_ value: PrototypeSystem) {
        system = value
        preferences.set(value.rawValue, forKey: PrototypeSystem.key(userID: userID, projectID: projectID))
        makePreview()
    }
    func makePreview() {
        snapshot = nil // Never show an earlier source version if compilation fails.
        do { snapshot = try PrototypeSnapshot.build(source: text, name: project?.name ?? "Workflow", system: system) }
        catch { self.error = "This preview could not render. Your source is unchanged." }
    }
    func load(using app: AppModel) async {
        do { try verify(app); await load(api: app.api, token: try await app.workspaceToken()) }
        catch { self.error = userMessage(error) }
    }
    func load(api: APIClient, token: String) async {
        guard !busy, project == nil else { return }
        loading = true; error = nil
        defer { loading = false }
        do {
            let latest = try await api.project(projectID, token: token)
            try Task.checkCancellation()
            project = latest; text = latest.structuredLanguage; draftBase = latest.updatedAt
            if let draft = try drafts.load(userID: userID, projectID: projectID), draft.text != text {
                // Keep a revoked editor's draft available for copying, never permit its upload.
                text = draft.text; restoredDraft = true; draftBase = draft.baseUpdatedAt
                hasConflict = draft.baseUpdatedAt != latest.updatedAt
            }
        } catch is CancellationError { }
        catch { self.error = userMessage(error) }
    }
    @discardableResult func keepDraft() -> Bool {
        if dirty { saved = false }
        guard let project, editable else { return !dirty }
        do {
            if dirty { try drafts.save(.init(projectID: projectID, userID: userID, baseUpdatedAt: draftBase ?? project.updatedAt, text: text)) }
            else { try drafts.remove(userID: userID, projectID: projectID) }
            return true
        } catch { self.error = "Draft remains on screen but could not be stored on this device. Copy it before leaving."; return false }
    }
    @discardableResult func save(using app: AppModel) async -> Bool {
        do { try verify(app); return await save(api: app.api, token: try await app.workspaceToken()) }
        catch { self.error = userMessage(error); return false }
    }
    @discardableResult func save(api: APIClient, token: String) async -> Bool {
        guard !busy, !hasConflict, !collaborationNeedsRefresh, let project else { return false }
        guard dirty else { return true }
        guard editable else { return false }
        saving = true; error = nil
        let submitted = text
        defer { saving = false }
        do {
            let updated = try await api.save(project, text: submitted, userID: userID, token: token)
            self.project = updated; draftBase = updated.updatedAt
            if text == submitted { text = updated.structuredLanguage; try drafts.remove(userID: userID, projectID: projectID); saved = true }
            else { keepDraft() }
            restoredDraft = false
            return !dirty
        } catch {
            if error as? AppFailure == .conflict { hasConflict = true }
            self.error = userMessage(error); keepDraft(); return false
        }
    }
    // Called before opening a collaboration sheet. Viewers/commenters with no draft
    // can read; an unsaved or conflicted draft must never be silently dropped.
    func prepareCollaboration(using app: AppModel) async -> Bool {
        guard !busy, !hasConflict else { return false }
        if dirty { if !(await save(using: app)) { return false } }
        return await refreshCollaboration(using: app)
    }
    @discardableResult func refreshCollaboration(using app: AppModel) async -> Bool {
        guard !busy else { return false }
        collaborating = true
        defer { collaborating = false }
        do {
            try verify(app)
            let latest = try await app.api.project(projectID, token: app.workspaceToken())
            reconcile(latest)
            collaborationNeedsRefresh = false
            error = nil
            return !hasConflict
        } catch { self.error = userMessage(error); return false }
    }
    func reconcile(_ latest: ProjectDetail) {
        // Refresh collaboration's server revision without adopting a concurrent edit
        // as the base of this local draft. Any changed source requires manual review.
        guard latest.structuredLanguage == project?.structuredLanguage else {
            recoveryProject = latest; hasConflict = true; return
        }
        project = latest; draftBase = latest.updatedAt; keepDraft()
    }
    func mutate(using app: AppModel, action: (APIClient, String) async throws -> Void) async -> Bool {
        guard !busy, !dirty, !hasConflict, !collaborationNeedsRefresh else { return false }
        collaborating = true; error = nil
        defer { collaborating = false }
        var committed = false
        do {
            try verify(app)
            let token = try await app.workspaceToken()
            try await action(app.api, token)
            committed = true
            collaborationNeedsRefresh = true
            let latest = try await app.api.project(projectID, token: token)
            reconcile(latest); collaborationNeedsRefresh = false
            return true
        } catch {
            // A lost POST response may have committed. Do not automatically retry.
            collaborationNeedsRefresh = true
            self.error = committed ? "Change saved. Refresh to load the latest project before continuing." : "Change could not be confirmed. Refresh and inspect the list before trying again."
            return committed
        }
    }
    func fetchRecovery(using app: AppModel) async {
        guard !busy else { return }; loading = true
        defer { loading = false }
        do { try verify(app); recoveryProject = try await app.api.project(projectID, token: app.workspaceToken()) }
        catch { self.error = userMessage(error) }
    }
    func resumeAfterManualReview() {
        guard let latest = recoveryProject else { return }
        project = latest; draftBase = latest.updatedAt; recoveryProject = nil
        hasConflict = false; collaborationNeedsRefresh = false; error = nil; keepDraft()
    }
    func discard() throws {
        try drafts.remove(userID: userID, projectID: projectID)
        text = project?.structuredLanguage ?? ""; hasConflict = false; restoredDraft = false
    }
    private func verify(_ app: AppModel) throws {
        guard app.user?.id == userID, app.phase == .workspace else { throw AppFailure.unauthorized }
    }
}
