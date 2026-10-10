import Foundation
import Combine

struct AccountDeletionPreview: Decodable {
    struct Effects: Decodable { let ownedPrivateProjects: Int; let comments: Int; let memberships: Int }
    struct Blocker: Decodable { let code: String; let message: String; let projectIds: [String]?; let workspaceIds: [String]? }
    let canDelete: Bool
    let confirmationPhrase: String
    let confirmationToken: String?
    let expiresAt: String?
    let effects: Effects
    let blockers: [Blocker]
    let retentionNotice: String

    func permitsConfirmation(at date: Date = Date()) -> Bool {
        guard canDelete, blockers.isEmpty, confirmationPhrase == "DELETE",
              effects.ownedPrivateProjects >= 0, effects.comments >= 0, effects.memberships >= 0,
              !retentionNotice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              let token = confirmationToken, AccountDeletionReceipt.validToken(token),
              let expiresAt else { return false }
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let expiry = parser.date(from: expiresAt) ?? ISO8601DateFormatter().date(from: expiresAt) else { return false }
        return expiry > date
    }
}

struct AccountDeletionResponse: Decodable { let deleted: Bool; let operationId: String }
struct AccountDeletionStatus: Decodable {
    enum State: String, Decodable { case awaitingConfirmation = "awaiting_confirmation", notStarted = "not_started", pending, deleted }
    let state: State
    let operationId: String?
    let confirmationExpiresAt: String?
}

struct AccountDeletionFailure: Error {
    let code: String
    let operationId: String?
    // These exact server errors guarantee that first execution did not start.
    var didNotStart: Bool {
        ["deletion_confirmation_required", "reauthentication_required", "deletion_preview_stale",
         "shared_projects_block_deletion", "shared_workspace_requires_admin", "account_identity_review_required",
         "deletion_unavailable", "identity_verification_unavailable"].contains(code)
    }
    var message: String {
        switch code {
        case "reauthentication_required": return "Sign in again on this device, then load a new deletion review. Refreshing the session is not enough."
        case "deletion_preview_stale": return "This review expired or your account data changed. Load a new review and confirm again."
        case "shared_projects_block_deletion", "shared_workspace_requires_admin": return "Shared ownership must be resolved with your workspace administrator before deleting this account."
        case "account_identity_review_required": return "Support needs to review this account’s identity before deletion can continue."
        case "account_deletion_started", "deletion_pending", "deletion_recovery_pending": return "Deletion is pending. Access may be locked, but completion has not been confirmed. Check the status or contact support."
        case "deletion_status_unavailable": return "Completion could not be verified. This does not prove whether deletion happened. Keep this recovery reference and contact support."
        case "deletion_unavailable": return "Account deletion is not available on the server yet. No deletion was confirmed."
        case "identity_verification_unavailable": return "Your identity could not be verified right now. No deletion started. Try again later."
        default: return "The server did not confirm the result. Check the status before taking any further action."
        }
    }
    var safeReference: String? {
        guard let operationId, !operationId.isEmpty, operationId.count <= 80,
              operationId.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-") }) else { return nil }
        return operationId
    }
}

struct AccountDeletionReceipt: Codable {
    let confirmationToken: String
    let userID: String
    let authSubject: String
    let createdAt: Date
    var operationId: String?
    var confirmedDeleted = false

    static func validToken(_ token: String) -> Bool {
        token.count == 43 && token.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") }
    }
}

enum AccountDeletionCleanupPolicy {
    static func mayClearSession(receipt: AccountDeletionReceipt, currentSubject: String?, currentUserID: String?) -> Bool {
        guard receipt.confirmedDeleted, currentSubject == receipt.authSubject else { return false }
        return currentUserID == nil || currentUserID == receipt.userID
    }
}

enum AccountDeletionLocalData {
    static func removeDrafts(userID: String, directory: URL? = nil) throws {
        let root = try directory ?? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
            .appendingPathComponent("WorkflowDrafts", isDirectory: true)
        guard FileManager.default.fileExists(atPath: root.path) else { return }
        for file in try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey]) where file.pathExtension == "json" {
            let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
            guard values.isRegularFile == true, values.isSymbolicLink != true else { throw AppFailure.storage }
            // Verify ownership from the protected draft itself; never purge another user's files.
            let draft = try JSONDecoder().decode(WorkflowDraft.self, from: Data(contentsOf: file))
            if draft.userID == userID { try FileManager.default.removeItem(at: file) }
        }
    }
}

struct AccountDeletionReceiptStore {
    private let storage = SecureStore()
    private let key = "dls-native-account-deletion-receipt-v1"
    func load() throws -> AccountDeletionReceipt? {
        guard let data = try storage.retrieve(key: key) else { return nil }
        let receipt = try JSONDecoder().decode(AccountDeletionReceipt.self, from: data)
        guard AccountDeletionReceipt.validToken(receipt.confirmationToken), !receipt.userID.isEmpty, !receipt.authSubject.isEmpty else { throw AppFailure.storage }
        return receipt
    }
    private func save(_ receipt: AccountDeletionReceipt) throws {
        guard AccountDeletionReceipt.validToken(receipt.confirmationToken), !receipt.userID.isEmpty, !receipt.authSubject.isEmpty else { throw AppFailure.storage }
        try storage.store(key: key, value: JSONEncoder().encode(receipt))
    }
    func insert(_ receipt: AccountDeletionReceipt) throws {
        guard try load() == nil else { throw AppFailure.storage }
        try save(receipt)
    }
    func update(_ receipt: AccountDeletionReceipt) throws {
        try requireMatching(receipt)
        try save(receipt)
    }
    func requireMatching(_ receipt: AccountDeletionReceipt) throws {
        guard let current = try load(), current.confirmationToken == receipt.confirmationToken,
              current.userID == receipt.userID, current.authSubject == receipt.authSubject else { throw AppFailure.storage }
    }
    func remove(matching receipt: AccountDeletionReceipt) throws {
        try requireMatching(receipt)
        try storage.remove(key: key)
    }
}

actor AccountDeletionAPI {
    private struct ErrorBody: Decodable { let code: String; let operationId: String? }
    private let session: URLSession
    init(session: URLSession? = nil) {
        if let session { self.session = session; return }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 45
        configuration.httpCookieStorage = nil
        configuration.urlCache = nil
        self.session = URLSession(configuration: configuration, delegate: RejectRedirects(), delegateQueue: nil)
    }
    func preview(bearer: String) async throws -> AccountDeletionPreview {
        try await request("deletion-preview", bearer: bearer)
    }
    func execute(receipt: String, bearer: String) async throws -> AccountDeletionResponse {
        struct Body: Encodable { let confirmationToken: String; let confirmation = "DELETE" }
        let result: AccountDeletionResponse = try await request("deletion", bearer: bearer,
            body: JSONEncoder().encode(Body(confirmationToken: receipt)))
        guard result.deleted, !result.operationId.isEmpty else { throw AppFailure.invalidResponse }
        return result
    }
    func status(receipt: String) async throws -> AccountDeletionStatus {
        struct Body: Encodable { let confirmationToken: String }
        let result: AccountDeletionStatus = try await request("deletion-status", bearer: nil,
            body: JSONEncoder().encode(Body(confirmationToken: receipt)))
        if result.state == .pending || result.state == .deleted {
            guard let operationId = result.operationId, !operationId.isEmpty else { throw AppFailure.invalidResponse }
        }
        return result
    }
    private func request<T: Decodable>(_ endpoint: String, bearer: String?, body: Data? = nil) async throws -> T {
        guard ["deletion-preview", "deletion", "deletion-status"].contains(endpoint) else { throw AppFailure.configuration }
        let url = AppConfiguration.apiOrigin.appendingPathComponent("api/account/" + endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = body == nil ? "GET" : "POST"
        request.httpBody = body
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        if let bearer { request.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization") }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, data.count < 1_000_000 else { throw AppFailure.invalidResponse }
        // Every non-200 result, including redirects and an absent production route, fails closed.
        if http.statusCode != 200 {
            let failure = try? JSONDecoder().decode(ErrorBody.self, from: data)
            let expectedStatus = ["deletion_confirmation_required": 400, "reauthentication_required": 401,
                "deletion_preview_stale": 409, "shared_projects_block_deletion": 409, "shared_workspace_requires_admin": 409,
                "account_identity_review_required": 409, "account_deletion_started": 409,
                "deletion_unavailable": 503, "identity_verification_unavailable": 503,
                "deletion_pending": 503, "deletion_recovery_pending": 503, "deletion_status_unavailable": 404]
            let code = failure.flatMap { expectedStatus[$0.code] == http.statusCode ? $0.code : nil } ?? "unrecognized_response"
            throw AccountDeletionFailure(code: code, operationId: failure?.operationId)
        }
        do { return try JSONDecoder().decode(T.self, from: data) }
        catch { throw AppFailure.invalidResponse }
    }
}

@MainActor
final class AccountDeletionModel: ObservableObject {
    @Published private(set) var preview: AccountDeletionPreview?
    @Published private(set) var receipt: AccountDeletionReceipt?
    @Published private(set) var busy = false
    @Published private(set) var message: String?
    @Published private(set) var needsReauthentication = false
    @Published var confirmation = ""
    private var previewBearer: String?
    private var previewSubject: String?
    private var receiptReadable = true
    private let api: AccountDeletionAPI
    private let store = AccountDeletionReceiptStore()
    let userID: String

    init(userID: String, receipt: AccountDeletionReceipt? = nil, api: AccountDeletionAPI = AccountDeletionAPI()) {
        var restored = receipt
        var readFailed = false
        if restored == nil {
            do { restored = try AccountDeletionReceiptStore().load() } catch { readFailed = true }
        }
        self.userID = restored?.userID ?? userID; self.receipt = restored; self.api = api
        receiptReadable = !readFailed
        if readFailed { message = "This device could not read its secure recovery state. Deletion is disabled until that can be verified." }
    }
    var canConfirm: Bool { receiptReadable && !busy && receipt == nil && confirmation == "DELETE" && preview?.permitsConfirmation() == true && previewBearer != nil }
    var reference: String? { AccountDeletionFailure(code: "", operationId: receipt?.operationId).safeReference }

    func load(using app: AppModel) async {
        guard receiptReadable, !busy, receipt == nil, app.user?.id == userID else { return }
        guard !app.auth.hasActiveSignIn else { message = "Finish or cancel your current sign-in attempt before reviewing deletion."; return }
        busy = true; message = nil; confirmation = ""; preview = nil; previewBearer = nil; previewSubject = nil; needsReauthentication = false
        defer { busy = false }
        do {
            let session = try await app.auth.deletionSession()
            let result = try await api.preview(bearer: session.bearer)
            guard app.user?.id == userID, app.auth.currentSubject == session.subject else { throw AppFailure.unauthorized }
            preview = result
            if result.permitsConfirmation() { previewBearer = session.bearer; previewSubject = session.subject }
        } catch { present(error) }
    }
    func execute(using app: AppModel) async {
        guard canConfirm else { message = "The review or confirmation is no longer valid. Load a fresh review and confirm again."; return }
        guard !app.auth.hasActiveSignIn else { message = "Finish or cancel your current sign-in attempt before deleting this account."; return }
        guard app.user?.id == userID, let token = preview?.confirmationToken, let bearer = previewBearer,
              let subject = previewSubject, app.auth.currentSubject == subject else { return }
        busy = true; app.busy = true; message = nil
        defer { busy = false; app.busy = false }
        let pending = AccountDeletionReceipt(confirmationToken: token, userID: userID, authSubject: subject, createdAt: Date())
        do {
            // Persist BEFORE any destructive request. No receipt or bearer is logged.
            try store.insert(pending)
            receipt = pending
        } catch { message = "This device could not securely retain a recovery receipt. No deletion request was sent."; return }
        do {
            let result = try await api.execute(receipt: token, bearer: bearer)
            await confirmDeleted(operationID: result.operationId, using: app)
        } catch let failure as AccountDeletionFailure where failure.didNotStart {
            // Receipt alone may be retired when the server guarantees no operation started.
            // Sessions and drafts are preserved on every failed operation.
            do { try store.remove(matching: pending); receipt = nil } catch { message = "No deletion started, but this device could not clear the unused receipt. Contact support."; return }
            preview = nil; previewBearer = nil; confirmation = ""; present(failure)
        } catch {
            if let failure = error as? AccountDeletionFailure, let reference = failure.safeReference {
                receipt?.operationId = reference
                if let receipt { try? store.update(receipt) }
            }
            present(error, uncertain: true)
        }
    }
    func checkStatus(using app: AppModel) async {
        guard !busy, let receipt else { return }
        busy = true; message = nil
        defer { busy = false }
        do {
            let status = try await api.status(receipt: receipt.confirmationToken)
            if status.state == .deleted, let operationID = status.operationId { await confirmDeleted(operationID: operationID, using: app) }
            else if status.state == .notStarted {
                try store.remove(matching: receipt); self.receipt = nil; preview = nil; previewBearer = nil; previewSubject = nil; confirmation = ""
                message = "The server confirmed that deletion did not start. Load a new review if you still want to delete this account."
                await app.resumeAfterUnstartedDeletion()
            } else if status.state == .awaitingConfirmation {
                message = "The server has not accepted deletion yet. An interrupted request could still arrive before the review expires. Keep this receipt and check again after that window."
            } else {
                self.receipt?.operationId = status.operationId
                if let current = self.receipt { try store.update(current) }
                message = AccountDeletionFailure(code: "deletion_pending", operationId: status.operationId).message
            }
        } catch { present(error, uncertain: true) }
    }
    func finishLocalCleanup(using app: AppModel) async {
        guard !busy, let receipt, receipt.confirmedDeleted else { return }
        busy = true
        defer { busy = false }
        do { try await app.finishAccountDeletion(receipt) }
        catch { message = "Your account was deleted, but this device could not finish clearing its saved data. Retry device cleanup." }
    }
    private func confirmDeleted(operationID: String, using app: AppModel) async {
        guard var receipt else { return }
        receipt.operationId = operationID; receipt.confirmedDeleted = true; self.receipt = receipt
        do {
            try store.update(receipt)
            try await app.finishAccountDeletion(receipt)
        } catch { message = "Your account was deleted, but this device could not finish clearing its saved data. Retry device cleanup." }
    }
    private func present(_ error: Error, uncertain: Bool = false) {
        if let failure = error as? AccountDeletionFailure {
            message = failure.code == "unrecognized_response" && !uncertain
                ? "Account deletion is unavailable or returned an unexpected response. No deletion request was sent."
                : failure.message
            needsReauthentication = failure.code == "reauthentication_required"
        } else {
            message = uncertain ? "The request was interrupted. Completion is unknown. Your recovery receipt is saved on this device; check the status before doing anything else." : userMessage(error)
        }
    }
}
