import Foundation
import SwiftUI

// Release-visible sample workspace. All API traffic is intercepted by this actor;
// unknown routes/credentials fail closed and never fall back to the cloud transport.
actor ReviewDemoStore {
    nonisolated let userID = "demo-" + UUID().uuidString.lowercased()
    nonisolated let token = "local-demo-" + UUID().uuidString
    private var revision = 1
    private var projects: [[String: Any]] = []
    private var active = true
    private var user: [String: Any] { ["id":userID, "name":"Sample Designer", "email":"designer@example.invalid", "initials":"SD", "color":"purple"] }
    private var workspace: [String: Any] { ["id":"demo-workspace", "name":"Sample workspace", "members":[["userId":userID,"role":"Admin","user":user]]] }
    private let sample = "GIVEN\na button named \"Open\"\n\nWHEN\nuser clicks button \"Open\"\n\nTHEN\nshow dialog \"Details\" with content \"Hello preview\""
    private func generated(_ text: String, name: String) throws -> Any {
        try JSONSerialization.jsonObject(with: JSONEncoder().encode(IntentDocument(source: text).generated(name: name)))
    }
    private func makeProject(name: String, description: String) throws -> [String: Any] {
        ["id":"demo-" + UUID().uuidString.lowercased(), "name":name, "description":description, "workspaceId":"demo-workspace", "ownerId":userID, "status":"Draft", "structuredLanguage":sample, "updatedAt":"demo-revision-\(revision)", "generated":try generated(sample,name:name), "members":[["userId":userID,"role":"Admin","user":user]], "comments":[]]
    }
    func close() { active = false; projects = [] }
    func respond(_ request: URLRequest) throws -> (Data, URLResponse) {
        guard active, let url = request.url, url.scheme == "https", url.host == AppConfiguration.apiOrigin.host, url.port == nil, url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              request.value(forHTTPHeaderField: "Authorization") == "Bearer \(token)" else { throw AppFailure.unauthorized }
        if projects.isEmpty { projects = [try makeProject(name:"Sample interaction",description:"Explore, edit and save this on-device example.")] }
        let path = url.path, method = request.httpMethod ?? "GET"
        let body = (try request.httpBody.map { try JSONSerialization.jsonObject(with:$0) }) as? [String:Any] ?? [:]
        var result: Any; var status = 200
        if path == "/api/bootstrap", method == "GET" { result = ["user":user,"workspaces":[workspace],"projects":projects] }
        else if path == "/api/session", method == "GET" { result = ["authenticated":true,"provider":"local-demo","user":user] }
        else if path == "/api/projects", method == "POST" {
            guard body["workspaceId"] as? String == "demo-workspace", let name = body["name"] as? String, !name.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else { throw AppFailure.forbidden }
            revision += 1
            let project = try makeProject(name:name,description:body["description"] as? String ?? "")
            projects.insert(project,at:0); result=project; status=201
        } else {
            let parts=path.split(separator:"/").map(String.init)
            guard parts.count >= 3, parts[0] == "api", parts[1] == "projects", let index=projects.firstIndex(where:{$0["id"] as? String == parts[2]}) else { throw AppFailure.forbidden }
            var project=projects[index]
            if parts.count == 3, method == "GET" { result=project }
            else if parts.count == 3, method == "PATCH" {
                guard body["expectedUpdatedAt"] as? String == project["updatedAt"] as? String else { throw AppFailure.conflict }
                guard let text=body["structuredLanguage"] as? String else { throw AppFailure.invalidResponse }
                project["structuredLanguage"]=text; project["generated"]=try generated(text,name:project["name"] as? String ?? "Sample")
                revision += 1; project["updatedAt"]="demo-revision-\(revision)"; projects[index]=project; result=project
            } else if parts.count == 4, parts[3] == "comments", method == "POST" {
                guard let text=body["body"] as? String, !text.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else { throw AppFailure.invalidResponse }
                let comment: [String:Any] = ["id":"demo-comment-" + UUID().uuidString.lowercased(),"userId":userID,"body":text,"anchor":body["anchor"] as? String ?? "General","resolved":false,"createdAt":ISO8601DateFormatter().string(from:Date()),"user":user]
                var comments=project["comments"] as? [[String:Any]] ?? []; comments.insert(comment,at:0); project["comments"]=comments; result=comment; status=201
                revision += 1; project["updatedAt"]="demo-revision-\(revision)"; projects[index]=project
            } else if parts.count == 5, parts[3] == "comments", method == "PATCH" {
                var comments=project["comments"] as? [[String:Any]] ?? []
                guard let i=comments.firstIndex(where:{$0["id"] as? String == parts[4]}), let resolved=body["resolved"] as? Bool else { throw AppFailure.invalidResponse }
                comments[i]["resolved"]=resolved; project["comments"]=comments; result=comments[i]
                revision += 1; project["updatedAt"]="demo-revision-\(revision)"; projects[index]=project
            } else if parts.count == 4, parts[3] == "share", method == "POST" {
                guard let email=body["email"] as? String, email.hasSuffix("@example.invalid"), let role=body["role"] as? String, CollaborationPolicy.roles.contains(role) else { throw AppFailure.forbidden }
                var members=project["members"] as? [[String:Any]] ?? []
                guard !members.contains(where:{($0["user"] as? [String:Any])?["email"] as? String == email}) else { throw AppFailure.conflict }
                let id="demo-member-" + UUID().uuidString.lowercased()
                let member: [String:Any] = ["userId":id,"role":role,"user":["id":id,"name":"Sample teammate","email":email]]
                members.append(member); project["members"]=members; result=member; status=201
                revision += 1; project["updatedAt"]="demo-revision-\(revision)"; projects[index]=project
            } else if parts.count == 5, parts[3] == "members", method == "PATCH" {
                var members=project["members"] as? [[String:Any]] ?? []
                guard parts[4] != userID, let i=members.firstIndex(where:{$0["userId"] as? String == parts[4]}), let role=body["role"] as? String, CollaborationPolicy.roles.contains(role) else { throw AppFailure.forbidden }
                members[i]["role"]=role; project["members"]=members; result=members[i]
                revision += 1; project["updatedAt"]="demo-revision-\(revision)"; projects[index]=project
            } else { throw AppFailure.forbidden }
        }
        return (try JSONSerialization.data(withJSONObject:result), HTTPURLResponse(url:url,statusCode:status,httpVersion:nil,headerFields:nil)!)
    }
}

struct ReviewDemoView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var app = AppModel(demo: ReviewDemoStore())
    @State private var confirmExit = false
    @State private var closing = false
    var body: some View {
        VStack(spacing:0) {
            HStack(alignment:.top) {
                VStack(alignment:.leading,spacing:4) {
                    Text("Sample workspace · On this device").font(.subheadline.weight(.semibold))
                    Text("Sample data stays on this device. Changes reset when you exit.").font(.caption)
                }
                Spacer()
                Button("Exit") { confirmExit=true }.disabled(app.busy || closing).accessibilityIdentifier("demo.exit")
            }.padding().background(DLSTheme.surface2)
            if app.phase == .workspace { WorkspaceView().environmentObject(app) }
            else if app.phase == .unavailable { NoticeView(text: app.notice ?? "Sample workspace could not open. Exit and try again.") }
            else { ProgressView("Opening sample workspace…").frame(maxWidth:.infinity,maxHeight:.infinity) }
        }.foregroundStyle(DLSTheme.text).background(DLSTheme.background)
            .task { await app.start() }
            .interactiveDismissDisabled()
            .confirmationDialog("Exit and reset sample data?",isPresented:$confirmExit,titleVisibility:.visible) {
                Button("Exit sample workspace",role:.destructive) {
                    closing=true
                    Task { await app.closeDemo(); dismiss() }
                }.accessibilityIdentifier("demo.confirmExit")
                Button("Keep exploring",role:.cancel) { }
            }
    }
}
