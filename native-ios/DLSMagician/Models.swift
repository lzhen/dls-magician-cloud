import Foundation

struct PublicAuthConfiguration: Decodable { let supabaseUrl: String; let supabasePublishableKey: String }
struct WorkspaceUser: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let email: String
    let initials: String?
    let color: String?
}
struct WorkspaceMember: Codable { let userId: String; let role: String; let user: WorkspaceUser? }
struct Workspace: Decodable, Identifiable {
    let id: String; let name: String; let members: [WorkspaceMember]
    func canCreate(userID: String) -> Bool {
        let matches = members.filter { $0.userId == userID }
        return matches.count == 1 && ["Admin", "Editor"].contains(matches[0].role)
    }
    func isAdmin(userID: String) -> Bool {
        let matches = members.filter { $0.userId == userID }
        return matches.count == 1 && matches[0].role == "Admin"
    }
}
struct WorkspaceSession: Decodable { let authenticated: Bool; let provider: String?; let user: WorkspaceUser? }
struct Bootstrap: Decodable { let user: WorkspaceUser; let workspaces: [Workspace]; let projects: [ProjectSummary] }
struct ProjectSummary: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String
    let workspaceId: String
    let status: String
    let updatedAt: String
    let accent: String?
}
struct GeneratedWorkflow: Codable {
    struct Step: Codable, Identifiable { let id: String; let type: String; let text: String; let entities: [String] }
    let intent: String
    let version: String
    let steps: [Step]
    let entities: [String]
    let valid: Bool
}
struct ProjectDetail: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let workspaceId: String
    let ownerId: String
    let status: String
    let structuredLanguage: String
    let updatedAt: String
    let generated: GeneratedWorkflow
    let members: [WorkspaceMember]
    var comments: [ProjectComment]? = nil

    func role(for userID: String) -> String {
        if ownerId == userID { return "Admin" }
        let matches = members.filter { $0.userId == userID }
        guard matches.count == 1, ["Admin", "Editor", "Commenter", "Viewer"].contains(matches[0].role) else { return "Viewer" }
        return matches[0].role
    }
    func canEdit(userID: String) -> Bool { ["Admin", "Editor"].contains(role(for: userID)) }
}
struct ProjectUpdate: Encodable { let structuredLanguage: String; let expectedUpdatedAt: String }

struct PendingSignIn: Codable {
    let id: UUID
    let createdAt: Date
    let kind: String
    var consumed: Bool
    func isValid(at now: Date = Date()) -> Bool {
        !consumed && now.timeIntervalSince(createdAt) >= 0 && now.timeIntervalSince(createdAt) < 600
    }
}

struct WorkflowDraft: Codable {
    let projectID: String
    let userID: String
    let baseUpdatedAt: String
    let text: String
}

// Shared by the native browser and XCTest: a cancelled browser's delayed callback
// cannot resolve a subsequent attempt's continuation.
struct AuthenticationCallbackGate {
    private(set) var currentID: UUID?
    mutating func begin() -> UUID {
        let id = UUID()
        currentID = id
        return id
    }
    mutating func finish(id: UUID) -> Bool {
        guard currentID == id else { return false }
        currentID = nil
        return true
    }
}

struct CreateWorkflowRequest: Encodable {
    let name: String
    let description: String
    let workspaceId: String
    let category = "Workflow"
    init(name: String, description: String, workspaceId: String) throws {
        self.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        self.description = description.trimmingCharacters(in: .whitespacesAndNewlines)
        self.workspaceId = workspaceId
        guard !self.name.isEmpty, !workspaceId.isEmpty else { throw AppFailure.invalidResponse }
    }
}

enum ProjectListState: Equatable {
    case loading, failed, emptyAccount, emptyWorkspace, noMatches, populated
    static func resolve(_ data: Bootstrap?, workspaceID: String, search: String, loadFailed: Bool) -> Self {
        if loadFailed { return .failed }
        guard let data else { return .loading }
        if data.projects.isEmpty { return .emptyAccount }
        let projects = workspaceID.isEmpty ? data.projects : data.projects.filter { $0.workspaceId == workspaceID }
        if projects.isEmpty { return .emptyWorkspace }
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines)
        return query.isEmpty || projects.contains(where: { $0.name.localizedCaseInsensitiveContains(query) || $0.description.localizedCaseInsensitiveContains(query) }) ? .populated : .noMatches
    }
}
