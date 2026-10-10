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
    init() {
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
        let (data, response) = try await session.data(for: request)
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
    private func projectPath(_ id: String) throws -> String {
        guard !id.isEmpty, id.utf8.allSatisfy({ (48...57).contains($0) || (65...90).contains($0) || (97...122).contains($0) || $0 == 45 || $0 == 95 }) else {
            throw AppFailure.invalidResponse
        }
        return "/api/projects/\(id)"
    }
}
