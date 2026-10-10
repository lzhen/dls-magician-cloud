import Foundation
import CryptoKit
import Combine

struct DraftStore {
    private func file(userID: String, projectID: String) throws -> URL {
        var root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
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
    @Published var saving = false
    @Published var loading = false
    @Published var restoredDraft = false
    @Published var saved = false
    @Published var hasConflict = false
    private let drafts = DraftStore()
    private var draftBase: String?
    let projectID: String
    let userID: String
    var dirty: Bool { project.map { text != $0.structuredLanguage } ?? false }
    var editable: Bool { project?.canEdit(userID: userID) == true }
    var role: String { project?.role(for: userID) ?? "Viewer" }

    init(projectID: String, userID: String) { self.projectID = projectID; self.userID = userID }
    func load(using app: AppModel) async {
        guard !loading else { return }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let project = try await app.api.project(projectID, token: app.auth.token())
            self.project = project
            text = project.structuredLanguage
            draftBase = project.updatedAt
            if let draft = try drafts.load(userID: userID, projectID: projectID), draft.text != text, editable {
                text = draft.text
                restoredDraft = true
                draftBase = draft.baseUpdatedAt
                hasConflict = draft.baseUpdatedAt != project.updatedAt
            }
        } catch { self.error = userMessage(error) }
    }
    func keepDraft() {
        if dirty { saved = false }
        guard let project, editable else { return }
        do {
            if dirty { try drafts.save(.init(projectID: projectID, userID: userID,
                                            baseUpdatedAt: draftBase ?? project.updatedAt, text: text)) }
            else { try drafts.remove(userID: userID, projectID: projectID) }
        } catch { self.error = "Your draft is still on screen, but it could not be saved on this device. Keep this screen open and retry." }
    }
    func save(using app: AppModel) async {
        guard let project, editable, dirty, !saving, !hasConflict else { return }
        saving = true
        error = nil
        let submitted = text
        defer { saving = false }
        do {
            let token = try await app.auth.token()
            let updated = try await app.api.save(project, text: submitted, userID: userID, token: token)
            self.project = updated
            draftBase = updated.updatedAt
            // TextEditor is disabled during save; this also protects any programmatic edit.
            if text == submitted { text = updated.structuredLanguage; try drafts.remove(userID: userID, projectID: projectID); saved = true }
            else { keepDraft() }
            restoredDraft = false
        } catch {
            if error as? AppFailure == .conflict { hasConflict = true }
            self.error = userMessage(error)
            keepDraft()
        }
    }
    func discard() throws {
        try drafts.remove(userID: userID, projectID: projectID)
        text = project?.structuredLanguage ?? ""
        hasConflict = false
        restoredDraft = false
    }
}
