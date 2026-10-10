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
