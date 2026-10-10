import Foundation
import Combine
import Auth

@MainActor
final class AppModel: ObservableObject {
    enum Phase: Equatable { case launching, signedOut, workspace, unavailable }
    @Published var phase: Phase = .launching
    @Published var notice: String?
    @Published var busy = false
    @Published private(set) var bootstrap: Bootstrap?
    @Published var workspaceID = ""
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
}
