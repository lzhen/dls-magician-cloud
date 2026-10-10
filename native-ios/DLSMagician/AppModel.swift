import Foundation
import Combine
import Auth

@MainActor
final class AppModel: ObservableObject {
    enum Phase: Equatable { case launching, signedOut, workspace, unavailable, deletionRecovery }
    @Published var phase: Phase = .launching
    @Published var notice: String?
    @Published var busy = false
    @Published private(set) var bootstrap: Bootstrap?
    @Published var workspaceID = ""
    @Published private(set) var authenticationRevision = UUID()
    @Published private(set) var deletionReceipt: AccountDeletionReceipt?
    let api = APIClient()
    let auth = AuthService()
    private var configured = false
    private var starting = false
    private var queuedCallback: URL?
    private var sessionGeneration = UUID()

    var user: WorkspaceUser? { bootstrap?.user }
    var projects: [ProjectSummary] {
        let all = bootstrap?.projects ?? []
        // Project-only invitations can have no workspace membership.
        return workspaceID.isEmpty ? all : all.filter { $0.workspaceId == workspaceID }
    }

    func start() async {
        guard !starting else { return }
        starting = true
        defer {
            starting = false
            if configured, let url = queuedCallback {
                queuedCallback = nil
                Task { await receive(url) }
            }
        }
        phase = .launching
        notice = nil
        do {
            if let receipt = try AccountDeletionReceiptStore().load() {
                deletionReceipt = receipt
                phase = .deletionRecovery
                return
            }
            if !configured {
                try auth.configure(try await api.configuration())
                configured = true
            }
            if let url = queuedCallback {
                queuedCallback = nil
                _ = try await auth.complete(url)
            }
            if auth.hasStoredSession { try await hydrate() }
            else { phase = .signedOut }
        } catch {
            notice = userMessage(error)
            phase = configured && !auth.hasStoredSession ? .signedOut : .unavailable
        }
    }

    func signIn(_ provider: Provider) async {
        guard !busy, configured else { return }
        busy = true
        notice = nil
        defer { busy = false }
        do {
            try await auth.signIn(provider: provider)
            try await hydrate()
        } catch {
            notice = userMessage(error)
            phase = auth.hasStoredSession ? .unavailable : .signedOut
        }
    }
    func sendMagicLink(_ email: String) async {
        guard !busy, configured else { return }
        busy = true
        notice = nil
        defer { busy = false }
        do {
            try await auth.sendMagicLink(email: email.trimmingCharacters(in: .whitespacesAndNewlines))
            notice = "Check your email. Open the sign-in link on this iPhone within 10 minutes."
        } catch { notice = userMessage(error) }
    }
    func receive(_ url: URL) async {
        if !configured || starting { queuedCallback = url; return }
        // The system can deliver one successful callback through both native paths.
        if phase == .workspace && !auth.hasPendingAttempt { return }
        do {
            if try await auth.complete(url) { try await hydrate() }
        } catch { notice = userMessage(error) }
    }
    func cancelSignIn() {
        do { notice = try auth.cancel() ? "Sign-in cancelled." : "Finishing secure sign-in. Please wait a moment." }
        catch { notice = userMessage(error) }
    }
    func hydrate() async throws {
        let generation = sessionGeneration
        let token = try await auth.token()
        let session = try await api.workspaceSession(token: token)
        guard session.authenticated, let sessionUser = session.user else { throw AppFailure.unauthorized }
        let data = try await api.bootstrap(token: token)
        guard data.user.id == sessionUser.id, generation == sessionGeneration else { throw AppFailure.unauthorized }
        bootstrap = data
        if !workspaceID.isEmpty && !data.workspaces.contains(where: { $0.id == workspaceID }) { workspaceID = "" }
        phase = .workspace
        authenticationRevision = UUID()
        notice = nil
    }
    func refresh() async {
        do { try await hydrate() } catch { notice = userMessage(error) }
    }
    func signOut() async {
        guard !busy else { return }
        busy = true
        sessionGeneration = UUID()
        defer { busy = false }
        do {
            let revoked = try await auth.signOut()
            notice = revoked ? nil : "Signed out on this device. The server could not confirm session revocation."
        } catch {
            notice = "Sign-out could not finish clearing this device’s secure storage. Please retry."
            return
        }
        bootstrap = nil
        workspaceID = ""
        phase = .signedOut
    }

    func resumeAfterUnstartedDeletion() async {
        deletionReceipt = nil
        if phase == .deletionRecovery { await start() }
    }

    func finishAccountDeletion(_ receipt: AccountDeletionReceipt) async throws {
        guard receipt.confirmedDeleted else { throw AppFailure.invalidResponse }
        try AccountDeletionReceiptStore().requireMatching(receipt)
        let wasBusy = busy
        busy = true
        defer { busy = wasBusy }
        // Let a newly started sign-in finish or be cancelled explicitly before cleanup.
        guard !auth.hasActiveSignIn else { throw AppFailure.storage }
        if !configured {
            try auth.configure(try await api.configuration())
            configured = true
        }
        let currentSubject = auth.currentSubject
        if let currentSubject, let user,
           (currentSubject == receipt.authSubject) != (user.id == receipt.userID) { throw AppFailure.storage }
        // A malformed/unknown secure session must not be erased as if its owner were known.
        if currentSubject == nil, try auth.hasPersistedSession() { throw AppFailure.storage }
        let clearCurrent = AccountDeletionCleanupPolicy.mayClearSession(receipt: receipt,
            currentSubject: currentSubject, currentUserID: user?.id)
        sessionGeneration = UUID()
        try AccountDeletionLocalData.removeDrafts(userID: receipt.userID)
        if clearCurrent { _ = try await auth.signOut() }
        try AccountDeletionReceiptStore().remove(matching: receipt)
        deletionReceipt = nil
        if clearCurrent || currentSubject == nil {
            bootstrap = nil; workspaceID = ""; phase = .signedOut
            notice = "Your account was deleted and its saved data was cleared from this device."
        } else {
            // Completion for an old account must never log out a newly authenticated account.
            if bootstrap?.user.id == receipt.userID { bootstrap = nil; workspaceID = "" }
            do {
                try await hydrate()
                notice = "The previously requested account deletion completed. Your current account is still signed in."
            } catch {
                phase = .unavailable
                notice = "The previous account was deleted. Your current session is preserved, but its workspace could not open. Try again."
            }
        }
    }
}
