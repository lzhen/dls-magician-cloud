import XCTest
import SwiftUI
@testable import DLSMagician

final class NativeContractTests: XCTestCase {
    func testCSSGradientGeometryUsesRenderedBounds() {
        let down = DLSGradientGeometry.endpoints(size: CGSize(width: 200, height: 100), degrees: 180)
        XCTAssertEqual(down.start.x, 0.5, accuracy: 0.000001)
        XCTAssertEqual(down.start.y, 0, accuracy: 0.000001)
        XCTAssertEqual(down.end.y, 1, accuracy: 0.000001)
        let right = DLSGradientGeometry.endpoints(size: CGSize(width: 200, height: 100), degrees: 90)
        XCTAssertEqual(right.start.x, 0, accuracy: 0.000001)
        XCTAssertEqual(right.end.x, 1, accuracy: 0.000001)
        XCTAssertEqual(right.end.y, 0.5, accuracy: 0.000001)
        let diagonal = DLSGradientGeometry.endpoints(size: CGSize(width: 200, height: 100), degrees: 45)
        XCTAssertEqual(diagonal.start.x, 0.125, accuracy: 0.000001)
        XCTAssertEqual(diagonal.start.y, 1.25, accuracy: 0.000001)
        XCTAssertEqual(diagonal.end.x, 0.875, accuracy: 0.000001)
        XCTAssertEqual(diagonal.end.y, -0.25, accuracy: 0.000001)
        XCTAssertEqual(DLSGradientGeometry.farthestCornerRadius(size: CGSize(width: 6, height: 8), center: .center), 5, accuracy: 0.000001)
        XCTAssertEqual(DLSGradientGeometry.farthestCornerRadius(size: CGSize(width: 3, height: 4), center: .topLeading), 5, accuracy: 0.000001)
        XCTAssertEqual(DLSGradientGeometry.farthestCornerRadius(size: CGSize(width: 12, height: 8), center: UnitPoint(x: 0.25, y: 0.5)), 9.8488578018, accuracy: 0.000001)
    }

    func testLateCancelledBrowserCallbackCannotFinishNewAttempt() {
        var gate = AuthenticationCallbackGate()
        let cancelled = gate.begin()
        XCTAssertTrue(gate.finish(id: cancelled))
        let current = gate.begin()
        XCTAssertFalse(gate.finish(id: cancelled))
        XCTAssertEqual(gate.currentID, current)
        XCTAssertTrue(gate.finish(id: current))
        XCTAssertFalse(gate.finish(id: current))
    }
    func testOnlyExactCallbackWithOneCodeIsAccepted() throws {
        XCTAssertEqual(try AppConfiguration.callbackCode(URL(string: "design.zhenli.dlsmagician://auth/callback?code=one-time-code")!), "one-time-code")
        let rejected = [
            "https://auth/callback?code=x",
            "design.zhenli.dlsmagician://foreign/callback?code=x",
            "design.zhenli.dlsmagician://auth/wrong?code=x",
            "design.zhenli.dlsmagician://user@auth/callback?code=x",
            "design.zhenli.dlsmagician://auth:123/callback?code=x",
            "design.zhenli.dlsmagician://auth/callback?code=x&code=y",
            "design.zhenli.dlsmagician://auth/callback?code=",
            "design.zhenli.dlsmagician://auth/callback#access_token=secret",
            "design.zhenli.dlsmagician://auth/callback?code=x&refresh_token=secret",
            "design.zhenli.dlsmagician://auth/callback?error=access_denied"
        ]
        for value in rejected { XCTAssertThrowsError(try AppConfiguration.callbackCode(URL(string: value)!)) }
    }
    func testPKCECallbackAcceptsOnlyCredentialFreeFragmentMarkers() throws {
        for suffix in ["", "#", "#sb="] {
            XCTAssertEqual(try AppConfiguration.callbackCode(URL(string: "design.zhenli.dlsmagician://auth/callback?code=synthetic" + suffix)!), "synthetic")
        }
        for suffix in ["#sb=other", "#code=other", "#unknown=1", "#sb=&sb="] {
            XCTAssertThrowsError(try AppConfiguration.callbackCode(URL(string: "design.zhenli.dlsmagician://auth/callback?code=synthetic" + suffix)!))
        }
    }
    func testProviderErrorsDoNotBecomeInvalidLinkOrExposeDescriptions() {
        for suffix in ["?error=access_denied", "#error=access_denied&sb=", "?error=access_denied#error=access_denied&sb="] {
            XCTAssertThrowsError(try AppConfiguration.callbackCode(URL(string: "design.zhenli.dlsmagician://auth/callback" + suffix)!)) {
                XCTAssertEqual($0 as? AppFailure, .providerDeclined)
            }
        }
        XCTAssertThrowsError(try AppConfiguration.callbackCode(URL(string: "design.zhenli.dlsmagician://auth/callback#error_code=otp_expired&error_description=DO_NOT_DISPLAY&sb=")!)) {
            XCTAssertEqual($0 as? AppFailure, .emailLinkExpired)
            XCTAssertFalse(userMessage($0).contains("DO_NOT_DISPLAY"))
        }
    }
    func testTokenFragmentsAndMixedSuccessErrorsNeverSignIn() {
        for key in ["access_token", "refresh_token", "provider_token", "provider_refresh_token", "token_hash", "id_token"] {
            XCTAssertThrowsError(try AppConfiguration.callbackCode(URL(string: "design.zhenli.dlsmagician://auth/callback?code=synthetic#\(key)=synthetic")!)) {
                XCTAssertEqual($0 as? AppFailure, .callbackTokens)
            }
        }
        XCTAssertThrowsError(try AppConfiguration.callbackCode(URL(string: "design.zhenli.dlsmagician://auth/callback?code=synthetic#error=access_denied")!))
    }
    func testAuthorizationCannotStartAtAnUntrustedOrigin() {
        XCTAssertTrue(AppConfiguration.authorizationURLIsAllowed(URL(string: "https://vxlwnvwijnzimjvgpeug.supabase.co/auth/v1/authorize?provider=google")!))
        for value in ["http://vxlwnvwijnzimjvgpeug.supabase.co/auth/v1/authorize",
                      "https://vxlwnvwijnzimjvgpeug.supabase.co.evil.example/auth/v1/authorize",
                      "https://vxlwnvwijnzimjvgpeug.supabase.co/auth/v1/token",
                      "https://other.supabase.co/auth/v1/authorize"] {
            XCTAssertFalse(AppConfiguration.authorizationURLIsAllowed(URL(string: value)!))
        }
    }
    func testPendingAttemptExpiresAndCannotBeConsumedTwice() {
        let now = Date(timeIntervalSince1970: 1000)
        XCTAssertTrue(PendingSignIn(id: UUID(), createdAt: now, kind: "google", consumed: false).isValid(at: now.addingTimeInterval(599)))
        XCTAssertFalse(PendingSignIn(id: UUID(), createdAt: now, kind: "google", consumed: false).isValid(at: now.addingTimeInterval(600)))
        XCTAssertFalse(PendingSignIn(id: UUID(), createdAt: now, kind: "google", consumed: false).isValid(at: now.addingTimeInterval(-1)))
        XCTAssertFalse(PendingSignIn(id: UUID(), createdAt: now, kind: "google", consumed: true).isValid(at: now))
    }
    func testRealProjectDTOAndReadOnlyRole() throws {
        let json = #"{"id":"p-one","name":"Workflow","description":"Real data","workspaceId":"ws-one","ownerId":"owner","status":"Draft","structuredLanguage":"GIVEN\nA user\nWHEN\nA request\nTHEN\nA result","updatedAt":"2026-10-10T00:00:00.000Z","generated":{"intent":"Workflow","version":"1.0","steps":[],"entities":[],"valid":true},"members":[{"userId":"editor","role":"Editor"},{"userId":"viewer","role":"Viewer"}]}"#
        let project = try JSONDecoder().decode(ProjectDetail.self, from: Data(json.utf8))
        XCTAssertTrue(project.canEdit(userID: "editor"))
        XCTAssertTrue(project.canEdit(userID: "owner"))
        XCTAssertFalse(project.canEdit(userID: "workspace-admin"))
        XCTAssertFalse(project.canEdit(userID: "viewer"))
        XCTAssertFalse(project.canEdit(userID: "unknown"))
        XCTAssertEqual(project.role(for: "viewer"), "Viewer")
    }
    func testProjectOnlyGuestBootstrapDecodesWithoutWorkspace() throws {
        let json = #"{"user":{"id":"guest","name":"Guest","email":"guest@example.test"},"workspaces":[],"projects":[{"id":"p-one","name":"Invited","description":"Project-only access","workspaceId":"not-a-member","status":"Draft","updatedAt":"2026-10-10T00:00:00.000Z"}]}"#
        let data = try JSONDecoder().decode(Bootstrap.self, from: Data(json.utf8))
        XCTAssertTrue(data.workspaces.isEmpty)
        XCTAssertEqual(data.projects.count, 1)
    }
    func testUpdateContainsOnlyWorkflowAndExpectedRevision() throws {
        let data = try JSONEncoder().encode(ProjectUpdate(structuredLanguage: "GIVEN\nSaved content", expectedUpdatedAt: "2026-10-10T00:00:00.000Z"))
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: String])
        XCTAssertEqual(body, ["structuredLanguage": "GIVEN\nSaved content", "expectedUpdatedAt": "2026-10-10T00:00:00.000Z"])
    }
    func testAmbiguousWorkspaceMembershipDoesNotGrantAdmin() throws {
        let json = #"{"id":"ws-one","name":"Workspace","members":[{"userId":"user","role":"Admin"},{"userId":"user","role":"Viewer"}]}"#
        let workspace = try JSONDecoder().decode(Workspace.self, from: Data(json.utf8))
        XCTAssertFalse(workspace.isAdmin(userID: "user"))
        XCTAssertFalse(workspace.isAdmin(userID: "unknown"))
    }
}

private enum WorkflowFixtures {
    static func bootstrap(role: String = "Editor", userID: String = "synthetic", projects: String = "[]") -> Data {
        Data("""
        {"user":{"id":"\(userID)","name":"Synthetic","email":"synthetic@example.invalid"},"workspaces":[{"id":"workspace","name":"Workspace","members":[{"userId":"synthetic","role":"\(role)"}]}],"projects":\(projects)}
        """.utf8)
    }
    static let project = Data(#"{"id":"p-synthetic","name":"New workflow","description":"Synthetic only","workspaceId":"workspace","ownerId":"synthetic","status":"Draft","structuredLanguage":"GIVEN\nSynthetic","updatedAt":"2026-10-11T00:00:00Z","generated":{"intent":"Synthetic","version":"1.0","steps":[],"entities":[],"valid":true},"members":[{"userId":"synthetic","role":"Admin"}]}"#.utf8)
    static let list = #"[{"id":"p-synthetic","name":"New workflow","description":"Synthetic only","workspaceId":"workspace","status":"Draft","updatedAt":"2026-10-11T00:00:00Z"}]"#
}
private actor WorkflowHTTP {
    var steps: [(String, Int, Data)]
    var bodies: [Data] = []
    init(_ steps: [(String, Int, Data)]) { self.steps = steps }
    func respond(_ request: URLRequest) throws -> (Data, URLResponse) {
        XCTAssertFalse(steps.isEmpty)
        let step = steps.removeFirst()
        XCTAssertEqual(request.httpMethod, step.0)
        XCTAssertEqual(request.url?.host, "dlsmagician.empathie.ai")
        if let data = request.httpBody { bodies.append(data) }
        if step.1 == 0 { throw URLError(.timedOut) }
        return (step.2, HTTPURLResponse(url: request.url!, statusCode: step.1, httpVersion: nil, headerFields: nil)!)
    }
    func writtenBodies() -> [Data] { bodies }
    func remaining() -> Int { steps.count }
}
final class WorkflowCreationTests: XCTestCase {
    func testEmptyErrorsFiltersAndInvitedGuestAreDifferentStates() throws {
        let empty = try JSONDecoder().decode(Bootstrap.self, from: WorkflowFixtures.bootstrap())
        let populated = try JSONDecoder().decode(Bootstrap.self, from: WorkflowFixtures.bootstrap(projects: WorkflowFixtures.list))
        XCTAssertEqual(ProjectListState.resolve(nil, workspaceID: "", search: "", loadFailed: false), .loading)
        XCTAssertEqual(ProjectListState.resolve(empty, workspaceID: "", search: "", loadFailed: true), .failed)
        XCTAssertEqual(ProjectListState.resolve(empty, workspaceID: "", search: "", loadFailed: false), .emptyAccount)
        XCTAssertEqual(ProjectListState.resolve(populated, workspaceID: "", search: "", loadFailed: false), .populated)
        XCTAssertEqual(ProjectListState.resolve(populated, workspaceID: "other", search: "", loadFailed: false), .emptyWorkspace)
        XCTAssertEqual(ProjectListState.resolve(populated, workspaceID: "", search: "not found", loadFailed: false), .noMatches)
        let guest = Bootstrap(user: populated.user, workspaces: [], projects: populated.projects)
        XCTAssertEqual(ProjectListState.resolve(guest, workspaceID: "", search: "", loadFailed: false), .populated)
    }
    func testCreateSaveAndRefreshUseExistingContract() async throws {
        let http = WorkflowHTTP([("GET",200,WorkflowFixtures.bootstrap()),("POST",201,WorkflowFixtures.project),
                                 ("GET",200,WorkflowFixtures.bootstrap(projects: WorkflowFixtures.list)),
                                 ("GET",200,WorkflowFixtures.bootstrap(projects: WorkflowFixtures.list)),
                                 ("GET",200,WorkflowFixtures.project),("PATCH",200,WorkflowFixtures.project),
                                 ("GET",200,WorkflowFixtures.project)])
        let api = APIClient(transport: { try await http.respond($0) })
        let input = try CreateWorkflowRequest(name: " New workflow ", description: " Synthetic only ", workspaceId: "workspace")
        let created = try await api.create(input, userID: "synthetic", token: "synthetic-token")
        let refreshed = try await api.bootstrap(token: "synthetic-token")
        XCTAssertEqual(refreshed.projects.first?.id, created.id)
        _ = try await api.save(created, text: "GIVEN\nChanged", userID: "synthetic", token: "synthetic-token")
        _ = try await api.project(created.id, token: "synthetic-token")
        let bodies = await http.writtenBodies()
        let post = try XCTUnwrap(JSONSerialization.jsonObject(with: bodies[0]) as? [String:String])
        XCTAssertEqual(Set(post.keys), ["name","description","workspaceId","category"])
        XCTAssertEqual(post["name"], "New workflow")
        let patch = try XCTUnwrap(JSONSerialization.jsonObject(with: bodies[1]) as? [String:String])
        XCTAssertEqual(patch["expectedUpdatedAt"], created.updatedAt)
        XCTAssertEqual(patch["structuredLanguage"], "GIVEN\nChanged")
        let remaining = await http.remaining(); XCTAssertEqual(remaining, 0)
    }
    func testCreateRejectsReadOnlyRolesBeforePosting() async throws {
        for role in ["Viewer","Commenter","unknown"] {
            let http = WorkflowHTTP([("GET",200,WorkflowFixtures.bootstrap(role: role))])
            let api = APIClient(transport: { try await http.respond($0) })
            do { _ = try await api.create(CreateWorkflowRequest(name:"New",description:"",workspaceId:"workspace"),userID:"synthetic",token:"synthetic"); XCTFail("Must deny") }
            catch { XCTAssertEqual(error as? AppFailure, .forbidden) }
            let bodies = await http.writtenBodies(); XCTAssertTrue(bodies.isEmpty)
        }
    }
    func testCreateRejectsAccountSwitchBeforePosting() async throws {
        let http = WorkflowHTTP([("GET",200,WorkflowFixtures.bootstrap(userID:"other"))])
        let api = APIClient(transport: { try await http.respond($0) })
        do { _ = try await api.create(CreateWorkflowRequest(name:"New",description:"",workspaceId:"workspace"),userID:"synthetic",token:"synthetic"); XCTFail("Must deny") }
        catch { XCTAssertEqual(error as? AppFailure, .unauthorized) }
        let bodies = await http.writtenBodies(); XCTAssertTrue(bodies.isEmpty)
    }
    func testBootstrapHTTPAndMalformedErrorsNeverDecodeAsEmpty() async throws {
        for (status, expected) in [(401,AppFailure.unauthorized),(403,.forbidden),(500,.unavailable),(200,.invalidResponse)] {
            let http = WorkflowHTTP([("GET",status,Data("{}".utf8))])
            let api = APIClient(transport: { try await http.respond($0) })
            do { _ = try await api.bootstrap(token:"synthetic"); XCTFail("Must fail") }
            catch { XCTAssertEqual(error as? AppFailure, expected) }
        }
    }
    func testAmbiguousCreateIsNotAutomaticallyRetried() async throws {
        let http = WorkflowHTTP([("GET",200,WorkflowFixtures.bootstrap()),("POST",0,Data())])
        let api = APIClient(transport: { try await http.respond($0) })
        do { _ = try await api.create(CreateWorkflowRequest(name:"New",description:"",workspaceId:"workspace"),userID:"synthetic",token:"synthetic"); XCTFail("Must fail") } catch {}
        let bodies = await http.writtenBodies(); XCTAssertEqual(bodies.count,1)
    }
    func testWorkspaceCreationRoleCannotBeInferredFromProjectOrDuplicates() {
        let member = WorkspaceMember(userId:"synthetic",role:"Editor",user:nil)
        XCTAssertTrue(Workspace(id:"w",name:"w",members:[member]).canCreate(userID:"synthetic"))
        XCTAssertFalse(Workspace(id:"w",name:"w",members:[member,member]).canCreate(userID:"synthetic"))
        XCTAssertFalse(Workspace(id:"w",name:"w",members:[]).canCreate(userID:"synthetic"))
        XCTAssertThrowsError(try CreateWorkflowRequest(name:"  ",description:"",workspaceId:"w"))
    }
}
