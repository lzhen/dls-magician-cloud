import Foundation

struct ProjectComment: Codable, Identifiable {
    let id: String
    let userId: String
    let body: String
    let anchor: String
    let resolved: Bool
    let createdAt: String
    let user: WorkspaceUser?
    static let anchors = ["General", "GIVEN", "WHEN", "THEN", "Generated JSON", "Live preview"]
}
struct InviteRequest: Encodable { let email: String; let role: String }
struct RoleRequest: Encodable { let role: String }
struct CommentRequest: Encodable { let body: String; let anchor: String }
struct ResolveRequest: Encodable { let resolved: Bool }

enum CollaborationPolicy {
    static let roles = ["Viewer", "Commenter", "Editor", "Admin"]
    static func canComment(project: ProjectDetail, userID: String) -> Bool { ["Admin", "Editor", "Commenter"].contains(project.role(for: userID)) }
    static func canInvite(project: ProjectDetail, userID: String, email: String, role: String) -> Bool {
        guard roles.contains(role), project.canEdit(userID: userID) else { return false }
        let existing = project.members.first { $0.user?.email.lowercased() == email.lowercased() }
        if existing?.userId == project.ownerId && role != "Admin" { return false }
        return project.role(for: userID) == "Admin" || (role != "Admin" && existing == nil)
    }
    static func canChangeRole(project: ProjectDetail, userID: String, memberID: String, role: String) -> Bool {
        project.role(for: userID) == "Admin" && roles.contains(role) && project.members.contains { $0.userId == memberID } && (memberID != project.ownerId || role == "Admin")
    }
    static func link(projectID: String) -> URL? {
        guard !projectID.isEmpty, projectID.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") }) else { return nil }
        return URL(string: "https://dlsmagician.empathie.ai/#project/\(projectID)")
    }
}
