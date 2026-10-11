import Foundation

final class RejectRedirects: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        // Never forward workspace bearer tokens to a redirected host or login page.
        completionHandler(nil)
    }
}

actor APIClient {
    private let session: URLSession
    private let transport: (@Sendable (URLRequest) async throws -> (Data, URLResponse))?
    init(transport: (@Sendable (URLRequest) async throws -> (Data, URLResponse))? = nil) {
        self.transport = transport
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 20
        configuration.timeoutIntervalForResource = 30
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        session = URLSession(configuration: configuration, delegate: RejectRedirects(), delegateQueue: nil)
    }

    private func request<T: Decodable>(_ path: String, token: String? = nil,
                                      method: String = "GET", body: Data? = nil) async throws -> T {
        guard path.hasPrefix("/api/"), !path.contains(".."),
              let url = URL(string: path, relativeTo: AppConfiguration.apiOrigin)?.absoluteURL,
              url.scheme == "https", url.host == AppConfiguration.apiOrigin.host,
              url.port == nil, url.user == nil, url.password == nil else { throw AppFailure.configuration }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let result: (Data, URLResponse)
        if let transport { result = try await transport(request) }
        else { result = try await session.data(for: request) }
        let (data, response) = result
        try Task.checkCancellation()
        guard let http = response as? HTTPURLResponse else { throw AppFailure.invalidResponse }
        switch http.statusCode {
        case 200..<300: break
        case 401: throw AppFailure.unauthorized
        case 403: throw AppFailure.forbidden
        case 409: throw AppFailure.conflict
        default: throw AppFailure.unavailable
        }
        guard data.count < 16_000_000 else { throw AppFailure.invalidResponse }
        do { return try JSONDecoder().decode(T.self, from: data) }
        catch { throw AppFailure.invalidResponse }
    }
    func configuration() async throws -> PublicAuthConfiguration { try await request("/api/config") }
    func workspaceSession(token: String) async throws -> WorkspaceSession { try await request("/api/session", token: token) }
    func bootstrap(token: String) async throws -> Bootstrap { try await request("/api/bootstrap", token: token) }
    func project(_ id: String, token: String) async throws -> ProjectDetail {
        try await request(projectPath(id), token: token)
    }
    func save(_ project: ProjectDetail, text: String, userID: String, token: String) async throws -> ProjectDetail {
        let access = try await bootstrap(token: token)
        guard access.user.id == userID else { throw AppFailure.unauthorized }
        let latest = try await self.project(project.id, token: token)
        // Workspace administrators can read private projects, but do not inherit edit
        // permission. Saving requires ownership or explicit unique project membership.
        guard latest.canEdit(userID: userID) else { throw AppFailure.forbidden }
        guard latest.updatedAt == project.updatedAt else { throw AppFailure.conflict }
        return try await request(projectPath(project.id), token: token, method: "PATCH",
                                 body: JSONEncoder().encode(ProjectUpdate(structuredLanguage: text, expectedUpdatedAt: project.updatedAt)))
    }
    func create(_ input: CreateWorkflowRequest, userID: String, token: String) async throws -> ProjectDetail {
        let access = try await bootstrap(token: token)
        guard access.user.id == userID else { throw AppFailure.unauthorized }
        guard access.workspaces.first(where: { $0.id == input.workspaceId })?.canCreate(userID: userID) == true else { throw AppFailure.forbidden }
        // Never retry POST automatically: the server may have committed after a lost response.
        return try await request("/api/projects", token: token, method: "POST", body: JSONEncoder().encode(input))
    }
    func invite(projectID: String, email: String, role: String, userID: String, token: String) async throws -> WorkspaceMember {
        let project = try await collaborationAccess(projectID, userID: userID, token: token)
        let email = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard email.contains("@"), CollaborationPolicy.canInvite(project: project, userID: userID, email: email, role: role) else { throw AppFailure.forbidden }
        return try await request(projectPath(projectID) + "/share", token: token, method: "POST", body: JSONEncoder().encode(InviteRequest(email: email, role: role)))
    }
    func changeRole(projectID: String, memberID: String, role: String, userID: String, token: String) async throws -> WorkspaceMember {
        let project = try await collaborationAccess(projectID, userID: userID, token: token)
        guard CollaborationPolicy.canChangeRole(project: project, userID: userID, memberID: memberID, role: role) else { throw AppFailure.forbidden }
        return try await request(projectPath(projectID) + "/members/" + safeID(memberID), token: token, method: "PATCH", body: JSONEncoder().encode(RoleRequest(role: role)))
    }
    func addComment(projectID: String, body: String, anchor: String, userID: String, token: String) async throws -> ProjectComment {
        let project = try await collaborationAccess(projectID, userID: userID, token: token)
        let body = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard CollaborationPolicy.canComment(project: project, userID: userID), !body.isEmpty, ProjectComment.anchors.contains(anchor) else { throw AppFailure.forbidden }
        return try await request(projectPath(projectID) + "/comments", token: token, method: "POST", body: JSONEncoder().encode(CommentRequest(body: body, anchor: anchor)))
    }
    func resolveComment(projectID: String, commentID: String, resolved: Bool, userID: String, token: String) async throws -> ProjectComment {
        let project = try await collaborationAccess(projectID, userID: userID, token: token)
        guard CollaborationPolicy.canComment(project: project, userID: userID) else { throw AppFailure.forbidden }
        return try await request(projectPath(projectID) + "/comments/" + safeID(commentID), token: token, method: "PATCH", body: JSONEncoder().encode(ResolveRequest(resolved: resolved)))
    }
    private func collaborationAccess(_ id: String, userID: String, token: String) async throws -> ProjectDetail {
        guard try await bootstrap(token: token).user.id == userID else { throw AppFailure.unauthorized }
        return try await project(id, token: token)
    }
    private func safeID(_ id: String) throws -> String {
        _ = try projectPath(id)
        return id
    }
    private func projectPath(_ id: String) throws -> String {
        guard !id.isEmpty, id.utf8.allSatisfy({ (48...57).contains($0) || (65...90).contains($0) || (97...122).contains($0) || $0 == 45 || $0 == 95 }) else {
            throw AppFailure.invalidResponse
        }
        return "/api/projects/\(id)"
    }
}
