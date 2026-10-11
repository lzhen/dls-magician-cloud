import XCTest
@testable import DLSMagician

final class WorkflowExperienceTests: XCTestCase {
    static let source = "GIVEN\na button named \"Open\"\n\nWHEN\nuser clicks button \"Open\"\n\nTHEN\nshow dialog \"Details\" with content \"Hello preview\""
    func testStructuredEditingPreservesUnrelatedSourceAndUnicode() {
        let raw = "untouched preamble 🪄\r\ngiven\r\na button \"你好\"\r\n\r\nWHEN\r\nclick\r\nTHEN\r\nshow it"
        let document = IntentDocument(source: raw)
        XCTAssertEqual(document.blocks.count, 3)
        XCTAssertTrue(document.valid)
        XCTAssertEqual(document.source, raw)
        let changed = document.replacing(1, with: "new action")
        XCTAssertTrue(changed.hasPrefix("untouched preamble 🪄\r\ngiven\r\na button \"你好\"\r\n\r\nWHEN\r\n"))
        XCTAssertTrue(changed.hasSuffix("THEN\r\nshow it"))
        XCTAssertEqual(IntentDocument(source: changed).blocks[1].body, "new action")
        XCTAssertEqual(document.appending("BAD"), raw)
    }
    func testIncompleteDraftIsNotAValidityGate() {
        let document = IntentDocument(source: "GIVEN\n")
        XCTAssertFalse(document.valid)
        XCTAssertEqual(IntentDocument(source: "GIVEN").replacing(0, with: "a button"), "GIVEN\na button")
        XCTAssertEqual(document.appending("AND"), "GIVEN\n\n\nAND\n")
    }
    func testPreviewJSONCarriesRealBindingsAndUnchangedInteractionsAcrossSystems() throws {
        let dls = try PrototypeSnapshot.build(source: Self.source, name: "Fixture", system: .dls)
        let material = try PrototypeSnapshot.build(source: Self.source, name: "Fixture", system: .material)
        let ant = try PrototypeSnapshot.build(source: Self.source, name: "Fixture", system: .ant)
        func object(_ value: PrototypeSnapshot) throws -> [String: Any] { try JSONSerialization.jsonObject(with: Data(value.json.utf8)) as! [String: Any] }
        let a = try object(dls), b = try object(material), c = try object(ant)
        XCTAssertEqual(dls.source, material.source)
        XCTAssertNotEqual(dls.revision, material.revision)
        XCTAssertEqual(a["interactions"] as? NSArray, b["interactions"] as? NSArray)
        XCTAssertEqual(a["interactions"] as? NSArray, c["interactions"] as? NSArray)
        XCTAssertFalse((a["interactions"] as? NSArray ?? []).isEqual(to: []))
        XCTAssertEqual((b["designSystem"] as? [String: Any])?["id"] as? String, "material")
        XCTAssertEqual((c["designSystem"] as? [String: Any])?["implementation"] as? String, "html-preview")
        XCTAssertTrue(ant.json.contains("Modal"))
    }
    func testPreviewIsOfflineAndUserContentCannotBecomeExecutableScript() throws {
        let raw = Self.source + "\nAND\ntext named \"</script><script>alert('oops')</script>🪄\""
        let snapshot = try PrototypeSnapshot.build(source: raw, name: "</script>", system: .dls)
        XCTAssertFalse(snapshot.html.contains("<script>alert('oops')"))
        XCTAssertTrue(snapshot.html.contains("connect-src 'none'"))
        XCTAssertTrue(snapshot.html.contains("form-action 'none'"))
        XCTAssertEqual(snapshot.source, raw)
    }
    func testRolePolicyNeverEscalatesViewerCommenterOrWorkspaceOnly() throws {
        for role in ["Viewer", "Commenter", "Editor", "Admin"] {
            let p = try project(role: role)
            XCTAssertEqual(CollaborationPolicy.canComment(project: p, userID: "actor"), role != "Viewer")
            XCTAssertEqual(CollaborationPolicy.canInvite(project: p, userID: "actor", email: "new@example.invalid", role: "Viewer"), ["Editor", "Admin"].contains(role))
            XCTAssertEqual(CollaborationPolicy.canInvite(project: p, userID: "actor", email: "new@example.invalid", role: "Admin"), role == "Admin")
            XCTAssertFalse(CollaborationPolicy.canChangeRole(project: p, userID: "actor", memberID: "owner", role: "Viewer"))
            XCTAssertFalse(CollaborationPolicy.canInvite(project: p, userID: "workspace-admin-only", email: "new@example.invalid", role: "Editor"))
        }
        let p = try project(role: "Editor")
        XCTAssertFalse(CollaborationPolicy.canInvite(project: p, userID: "actor", email: "owner@example.invalid", role: "Editor"))
        XCTAssertEqual(CollaborationPolicy.link(projectID: "project-1")?.absoluteString, "https://dlsmagician.empathie.ai/#project/project-1")
        XCTAssertNil(CollaborationPolicy.link(projectID: "../private"))
    }
    func testCollaborationPayloadsMatchServerContractAndRefreshIsReadOnly() async throws {
        let fixture = ContractFixture(role: "Admin")
        let api = APIClient(transport: { try await fixture.respond($0) })
        _ = try await api.invite(projectID: "project", email: " NEW@example.invalid ", role: "Commenter", userID: "actor", token: "synthetic")
        _ = try await api.addComment(projectID: "project", body: " Review ", anchor: "Live preview", userID: "actor", token: "synthetic")
        _ = try await api.resolveComment(projectID: "project", commentID: "comment", resolved: true, userID: "actor", token: "synthetic")
        _ = try await api.changeRole(projectID: "project", memberID: "actor", role: "Editor", userID: "actor", token: "synthetic")
        let mutations = await fixture.requests.filter { $0.httpMethod != "GET" }
        XCTAssertEqual(mutations.count, 4)
        let bodies = try mutations.map { try JSONSerialization.jsonObject(with: $0.httpBody!) as! [String: Any] }
        XCTAssertEqual(bodies[0]["email"] as? String, "new@example.invalid")
        XCTAssertEqual(bodies[1]["body"] as? String, "Review")
        XCTAssertEqual(bodies[1]["anchor"] as? String, "Live preview")
        XCTAssertNil(bodies[1]["replyTo"])
        XCTAssertEqual(bodies[2]["resolved"] as? Bool, true)
        XCTAssertEqual(bodies[3]["role"] as? String, "Editor")
    }
    func testForbiddenCollaborationNeverSendsWrite() async throws {
        let fixture = ContractFixture(role: "Viewer")
        let api = APIClient(transport: { try await fixture.respond($0) })
        do { _ = try await api.addComment(projectID: "project", body: "x", anchor: "General", userID: "actor", token: "synthetic"); XCTFail() } catch { XCTAssertEqual(error as? AppFailure, .forbidden) }
        do { _ = try await api.invite(projectID: "project", email: "x@example.invalid", role: "Admin", userID: "actor", token: "synthetic"); XCTFail() } catch { XCTAssertEqual(error as? AppFailure, .forbidden) }
        let requests = await fixture.requests
        XCTAssertTrue(requests.allSatisfy { $0.httpMethod == "GET" })
    }
    func testCancelledCollaborationPreflightNeverWrites() async throws {
        let fixture = ContractFixture(role: "Admin")
        let api = APIClient(transport: { try await fixture.respond($0) })
        let task = Task { try await api.invite(projectID: "project", email: "new@example.invalid", role: "Viewer", userID: "actor", token: "synthetic") }
        task.cancel()
        do { _ = try await task.value; XCTFail("Cancelled request must not write") } catch { }
        let requests = await fixture.requests
        XCTAssertTrue(requests.allSatisfy { $0.httpMethod == "GET" })
    }
    @MainActor func testDraftRecoveryAndConflictDoNotOverwriteServer() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = DraftStore(rootOverride: root)
        try store.save(.init(projectID: "project", userID: "actor", baseUpdatedAt: "old", text: "GIVEN\nunsaved"))
        let fixture = ContractFixture(role: "Editor")
        let api = APIClient(transport: { try await fixture.respond($0) })
        let model = EditorModel(projectID: "project", userID: "actor", drafts: store)
        await model.load(api: api, token: "synthetic")
        XCTAssertTrue(model.hasConflict); XCTAssertTrue(model.restoredDraft)
        XCTAssertEqual(model.text, "GIVEN\nunsaved")
        let ok = await model.save(api: api, token: "synthetic")
        XCTAssertFalse(ok)
        let requests = await fixture.requests
        XCTAssertFalse(requests.contains { $0.httpMethod == "PATCH" })
    }
    @MainActor func testSaveIncompleteDraftDuplicateTapAndOfflineRecovery() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let fixture = ContractFixture(role: "Editor")
        let api = APIClient(transport: { try await fixture.respond($0) })
        let model = EditorModel(projectID: "project", userID: "actor", drafts: DraftStore(rootOverride: root))
        await model.load(api: api, token: "synthetic")
        model.text = "GIVEN\nincomplete"; model.keepDraft()
        async let first = model.save(api: api, token: "synthetic")
        async let second = model.save(api: api, token: "synthetic")
        let results = await [first, second]
        XCTAssertEqual(results.filter { $0 }.count, 1)
        let writes = await fixture.requests.filter { $0.httpMethod == "PATCH" }
        XCTAssertEqual(writes.count, 1)
        let body = try JSONSerialization.jsonObject(with: writes[0].httpBody!) as! [String: Any]
        XCTAssertNil(body["designSystem"]); XCTAssertNotNil(body["expectedUpdatedAt"])
        let reopened = EditorModel(projectID: "project", userID: "actor", drafts: DraftStore(rootOverride: root))
        await reopened.load(api: api, token: "synthetic")
        XCTAssertEqual(reopened.text, "GIVEN\nincomplete")
        XCTAssertFalse(reopened.dirty)
        XCTAssertFalse(reopened.restoredDraft)
        XCTAssertNil(try DraftStore(rootOverride: root).load(userID: "actor", projectID: "project"))
        model.text += " offline"; model.keepDraft(); await fixture.setOffline()
        let ok = await model.save(api: api, token: "synthetic")
        XCTAssertFalse(ok); XCTAssertTrue(model.dirty)
        XCTAssertEqual(try DraftStore(rootOverride: root).load(userID: "actor", projectID: "project")?.text, model.text)
    }
    @MainActor func testCollaborationRevisionRefreshCannotOverwriteConcurrentSource() async throws {
        let fixture = ContractFixture(role: "Admin")
        let api = APIClient(transport: { try await fixture.respond($0) })
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let model = EditorModel(projectID: "project", userID: "actor", drafts: DraftStore(rootOverride: root))
        await model.load(api: api, token: "synthetic")
        model.reconcile(try project(role: "Admin", revision: "v2"))
        XCTAssertEqual(model.project?.updatedAt, "v2"); XCTAssertFalse(model.hasConflict)
        model.text += "\nAND\nlocal draft"; model.keepDraft()
        model.reconcile(try project(role: "Admin", revision: "v3", source: "GIVEN\nremote source"))
        XCTAssertTrue(model.hasConflict); XCTAssertTrue(model.text.contains("local draft"))
        XCTAssertEqual(model.project?.updatedAt, "v2")
        model.resumeAfterManualReview()
        XCTAssertFalse(model.hasConflict); XCTAssertEqual(model.project?.updatedAt, "v3"); XCTAssertTrue(model.dirty)
    }
    @MainActor func testSystemChoiceIsLocalScopedAndKeepsSource() async throws {
        let defaults = UserDefaults(suiteName: "fixture-\(UUID())")!
        let model = EditorModel(projectID: "p1", userID: "u1", preferences: defaults)
        model.text = Self.source; model.selectSystem(.ant)
        XCTAssertEqual(model.text, Self.source)
        XCTAssertEqual(EditorModel(projectID: "p1", userID: "u1", preferences: defaults).system, .ant)
        XCTAssertEqual(EditorModel(projectID: "p2", userID: "u1", preferences: defaults).system, .dls)
        XCTAssertEqual(EditorModel(projectID: "p1", userID: "u2", preferences: defaults).system, .dls)
    }
    private func project(role: String, revision: String = "v1", source: String = WorkflowExperienceTests.source) throws -> ProjectDetail {
        try JSONDecoder().decode(ProjectDetail.self, from: ContractFixture.projectData(role: role, revision: revision, source: source))
    }
}
private actor ContractFixture {
    let role: String
    var requests: [URLRequest] = []
    var offline = false
    var source = WorkflowExperienceTests.source
    var revision = "v1"
    init(role: String) { self.role = role }
    func setOffline() { offline = true }
    static func projectData(role: String, revision: String, source: String) throws -> Data {
        let generated = try JSONSerialization.jsonObject(with: JSONEncoder().encode(IntentDocument(source: source).generated(name: "Fixture")))
        return try JSONSerialization.data(withJSONObject: ["id":"project","name":"Fixture","description":"","workspaceId":"workspace","ownerId":"owner","status":"Draft","structuredLanguage":source,"updatedAt":revision,"generated":generated,"members":[["userId":"actor","role":role,"user":["id":"actor","name":"Actor","email":"actor@example.invalid"]],["userId":"owner","role":"Admin","user":["id":"owner","name":"Owner","email":"owner@example.invalid"]]],"comments":[]])
    }
    func respond(_ request: URLRequest) async throws -> (Data, URLResponse) {
        requests.append(request)
        try await Task.sleep(nanoseconds: 20_000_000)
        if offline { throw URLError(.notConnectedToInternet) }
        let path = request.url!.path
        let body = (try? JSONSerialization.jsonObject(with: request.httpBody ?? Data())) as? [String: Any] ?? [:]
        let data: Data
        if path == "/api/bootstrap" { data = Data(#"{"user":{"id":"actor","name":"Actor","email":"actor@example.invalid"},"workspaces":[],"projects":[]}"#.utf8) }
        else if path == "/api/projects/project" {
            if request.httpMethod == "PATCH" { source = body["structuredLanguage"] as! String; revision = "v2" }
            data = try Self.projectData(role: role, revision: revision, source: source)
        } else if path.contains("comments") {
            data = try JSONSerialization.data(withJSONObject: ["id":"comment","userId":"actor","body":body["body"] ?? "Review","anchor":body["anchor"] ?? "General","resolved":body["resolved"] ?? false,"createdAt":"now"])
        } else { data = Data(#"{"userId":"new","role":"Viewer"}"#.utf8) }
        return (data, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
    }
}
