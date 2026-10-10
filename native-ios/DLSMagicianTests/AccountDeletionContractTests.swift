import XCTest
@testable import DLSMagician

final class AccountDeletionContractTests: XCTestCase {
    private let receiptToken = String(repeating: "a", count: 43)

    func testAccountSwitchNeverClearsNewSession() {
        let receipt = AccountDeletionReceipt(confirmationToken: receiptToken, userID: "old-user", authSubject: "old-subject", createdAt: Date(), operationId: "operation-1", confirmedDeleted: true)
        XCTAssertTrue(AccountDeletionCleanupPolicy.mayClearSession(receipt: receipt, currentSubject: "old-subject", currentUserID: "old-user"))
        XCTAssertFalse(AccountDeletionCleanupPolicy.mayClearSession(receipt: receipt, currentSubject: "new-subject", currentUserID: "new-user"))
        XCTAssertFalse(AccountDeletionCleanupPolicy.mayClearSession(receipt: receipt, currentSubject: "old-subject", currentUserID: "different-user"))
        XCTAssertFalse(AccountDeletionCleanupPolicy.mayClearSession(receipt: receipt, currentSubject: nil, currentUserID: nil))
        var pending = receipt; pending.confirmedDeleted = false
        XCTAssertFalse(AccountDeletionCleanupPolicy.mayClearSession(receipt: pending, currentSubject: "old-subject", currentUserID: "old-user"))
    }

    func testCleanupRemovesOnlyOriginalUsersDrafts() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let old = WorkflowDraft(projectID: "old-project", userID: "old-user", baseUpdatedAt: "revision", text: "Original draft")
        let current = WorkflowDraft(projectID: "new-project", userID: "new-user", baseUpdatedAt: "revision", text: "Keep this draft")
        try JSONEncoder().encode(old).write(to: root.appendingPathComponent("old.json"))
        try JSONEncoder().encode(current).write(to: root.appendingPathComponent("current.json"))
        try AccountDeletionLocalData.removeDrafts(userID: "old-user", directory: root)
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("old.json").path))
        let remaining = try JSONDecoder().decode(WorkflowDraft.self, from: Data(contentsOf: root.appendingPathComponent("current.json")))
        XCTAssertEqual(remaining.text, "Keep this draft")
    }

    func testAllRecoveryStatesDecodeWithoutTreatingUnknownAsDeleted() throws {
        for name in ["awaiting_confirmation", "not_started", "pending", "deleted"] {
            let json = Data("{\"state\":\"\(name)\",\"operationId\":\"operation-1\"}".utf8)
            let status = try JSONDecoder().decode(AccountDeletionStatus.self, from: json)
            XCTAssertEqual(status.state == .deleted, name == "deleted")
        }
        XCTAssertThrowsError(try JSONDecoder().decode(AccountDeletionStatus.self, from: Data(#"{"state":"unknown","operationId":"x"}"#.utf8)))
        XCTAssertFalse(AccountDeletionFailure(code: "deletion_pending", operationId: "operation-1").didNotStart)
        XCTAssertFalse(AccountDeletionFailure(code: "deletion_status_unavailable", operationId: nil).didNotStart)
    }

    func testExpiredOrBlockedPreviewCannotBeConfirmed() throws {
        let body: [String: Any] = ["canDelete": true, "confirmationPhrase": "DELETE", "confirmationToken": receiptToken,
            "expiresAt": "2026-10-10T22:20:00.000Z", "effects": ["ownedPrivateProjects": 1, "comments": 2, "memberships": 3],
            "blockers": [], "retentionNotice": "Shared versions are retained without account identifiers."]
        let preview = try JSONDecoder().decode(AccountDeletionPreview.self, from: JSONSerialization.data(withJSONObject: body))
        let cutoff = ISO8601DateFormatter().date(from: "2026-10-10T22:20:00Z")!
        XCTAssertTrue(preview.permitsConfirmation(at: cutoff.addingTimeInterval(-1)))
        XCTAssertFalse(preview.permitsConfirmation(at: cutoff))
        var blocked = body; blocked["blockers"] = [["code": "shared_projects_block_deletion", "message": "Ask the owner."]]
        let blockedPreview = try JSONDecoder().decode(AccountDeletionPreview.self, from: JSONSerialization.data(withJSONObject: blocked))
        XCTAssertFalse(blockedPreview.permitsConfirmation(at: cutoff.addingTimeInterval(-1)))
    }

    func testStatusUsesReceiptBodyWithoutAuthorizationOrURLSecrets() async throws {
        let api = client { request in
            XCTAssertEqual(request.url?.path, "/api/account/deletion-status")
            XCTAssertNil(request.url?.query)
            XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
            XCTAssertEqual(request.httpMethod, "POST")
            return (200, #"{"state":"pending","operationId":"operation-1"}"#)
        }
        let status = try await api.status(receipt: receiptToken)
        XCTAssertEqual(status.state, .pending)
    }

    func testFalseDeletedAndServerFailuresNeverBecomeSuccess() async throws {
        var api = client { _ in (200, #"{"deleted":false,"operationId":"operation-1"}"#) }
        do { _ = try await api.execute(receipt: receiptToken, bearer: "local-test-fixture"); XCTFail("False deletion must fail.") }
        catch { XCTAssertEqual(error as? AppFailure, .invalidResponse) }
        api = client { _ in (503, #"{"code":"deletion_pending","operationId":"operation-1"}"#) }
        do { _ = try await api.execute(receipt: receiptToken, bearer: "local-test-fixture"); XCTFail("Pending must fail.") }
        catch { XCTAssertEqual((error as? AccountDeletionFailure)?.code, "deletion_pending") }
        api = client { _ in (500, #"{"code":"deletion_unavailable"}"#) }
        do { _ = try await api.execute(receipt: receiptToken, bearer: "local-test-fixture"); XCTFail("Unexpected response must fail.") }
        catch { XCTAssertFalse((error as? AccountDeletionFailure)?.didNotStart ?? true) }
    }

    func testExecuteSendsOnlyConfirmationAndOriginalBearer() async throws {
        let api = client { request in
            XCTAssertEqual(request.url?.path, "/api/account/deletion")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer original-preview-fixture")
            XCTAssertNil(request.url?.query)
            var body = request.httpBody ?? Data()
            if body.isEmpty, let stream = request.httpBodyStream {
                stream.open(); defer { stream.close() }
                var buffer = [UInt8](repeating: 0, count: 1024)
                while stream.hasBytesAvailable {
                    let read = stream.read(&buffer, maxLength: buffer.count)
                    if read <= 0 { break }
                    body.append(contentsOf: buffer.prefix(read))
                }
            }
            let fields = try? JSONSerialization.jsonObject(with: body) as? [String: String]
            XCTAssertEqual(fields, ["confirmationToken": self.receiptToken, "confirmation": "DELETE"])
            return (200, #"{"deleted":true,"operationId":"operation-1"}"#)
        }
        let result = try await api.execute(receipt: receiptToken, bearer: "original-preview-fixture")
        XCTAssertTrue(result.deleted)
    }

    private func client(_ responder: @escaping (URLRequest) -> (Int, String)) -> AccountDeletionAPI {
        DeletionFixtureProtocol.responder = responder
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [DeletionFixtureProtocol.self]
        return AccountDeletionAPI(session: URLSession(configuration: configuration))
    }
}

private final class DeletionFixtureProtocol: URLProtocol {
    static var responder: ((URLRequest) -> (Int, String))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        guard let responder = Self.responder, let url = request.url else { return }
        let (status, body) = responder(request)
        let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(body.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() { }
}
