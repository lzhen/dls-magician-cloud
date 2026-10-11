#if DEBUG
import Foundation

// Every request in the editor UI fixture is intercepted here. No URLSession, account
// identity, email, project or collaboration data can reach production from this mode.
actor LocalWorkflowFixture {
    static let source = "GIVEN\na button named \"Open\"\n\nWHEN\nuser clicks button \"Open\"\n\nTHEN\nshow dialog \"Details\" with content \"Hello preview\""
    var revision = 1
    var text = ProcessInfo.processInfo.arguments.contains("--legacy") ? "GIVEN\nAn advertiser manages campaigns\nWHEN\nOffline data is ready\nTHEN\nThey can create a campaign" : LocalWorkflowFixture.source
    var comments: [[String: Any]] = []
    var members: [[String: Any]] = []
    private var role: String {
        ProcessInfo.processInfo.arguments.contains("--viewer") ? "Viewer" : ProcessInfo.processInfo.arguments.contains("--commenter") ? "Commenter" : "Admin"
    }
    private var user: [String: Any] { ["id": "synthetic", "name": "Synthetic", "email": "synthetic@example.invalid"] }
    private func project() throws -> [String: Any] {
        let generated = try JSONSerialization.jsonObject(with: JSONEncoder().encode(IntentDocument(source: text).generated(name: "Local interaction fixture")))
        return ["id":"synthetic-project", "name":"Local interaction fixture", "description":"Isolated fixture", "workspaceId":"workspace", "ownerId":role == "Admin" ? "synthetic" : "fixture-owner", "status":"Draft", "structuredLanguage":text, "updatedAt":"revision-\(revision)", "generated":generated, "members":[["userId":"synthetic", "role":role, "user":user]] + members, "comments":comments]
    }
    func respond(_ request: URLRequest) async throws -> (Data, URLResponse) {
        try await Task.sleep(nanoseconds: 100_000_000)
        let path = request.url!.path
        let body = (try? JSONSerialization.jsonObject(with: request.httpBody ?? Data())) as? [String: Any] ?? [:]
        var response: Any = [:]
        var status = 200
        if path == "/api/bootstrap" {
            response = ["user":user, "workspaces":[], "projects":[]]
        } else if request.httpMethod == "GET", path == "/api/projects/synthetic-project" {
            response = try project()
        } else if request.httpMethod == "PATCH", path == "/api/projects/synthetic-project" {
            if ProcessInfo.processInfo.arguments.contains("--offline") { throw URLError(.notConnectedToInternet) }
            if ProcessInfo.processInfo.arguments.contains("--conflict") { status = 409 }
            else { revision += 1; text = body["structuredLanguage"] as? String ?? text; response = try project() }
        } else if path.hasSuffix("/share") {
            revision += 1
            let member: [String: Any] = ["userId":"new-member", "role":body["role"] ?? "Viewer", "user":["id":"new-member","name":"New member","email":body["email"] ?? "new@example.invalid"]]
            members.append(member); response = member; status = 201
        } else if path.hasSuffix("/comments"), request.httpMethod == "POST" {
            revision += 1
            let comment: [String: Any] = ["id":"comment-\(revision)","userId":"synthetic","body":body["body"] ?? "", "anchor":body["anchor"] ?? "General", "resolved":false, "createdAt":"2026-10-11T12:00:00Z","user":user]
            comments.insert(comment, at: 0); response = comment; status = 201
        } else if path.contains("/comments/") {
            let id = request.url!.lastPathComponent
            guard let i = comments.firstIndex(where: { $0["id"] as? String == id }) else { throw AppFailure.invalidResponse }
            revision += 1; comments[i]["resolved"] = body["resolved"]; response = comments[i]
        } else if path.contains("/members/") {
            guard let i = members.firstIndex(where: { $0["userId"] as? String == request.url!.lastPathComponent }) else { throw AppFailure.invalidResponse }
            revision += 1; members[i]["role"] = body["role"]; response = members[i]
        } else { throw AppFailure.invalidResponse }
        return (try JSONSerialization.data(withJSONObject: response), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}
#endif
