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
