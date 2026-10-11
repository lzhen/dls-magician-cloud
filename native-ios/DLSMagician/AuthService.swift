import Foundation
import Auth
import AuthenticationServices
import CryptoKit
import Security

@MainActor
final class AuthService {
    private let storage = SecureStore()
    private let browser = AuthenticationBrowser()
    private var auth: AuthClient?
    private var exchangeInFlight = false
    private var exchangeTask: Task<Session, Error>?
    private var generation = UUID()
    private var activeAttempt: UUID?
    private var appleAttempt: AppleSignInAttempt?
    private let network: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 30
        configuration.httpCookieStorage = nil
        configuration.urlCache = nil
        return URLSession(configuration: configuration, delegate: RejectRedirects(), delegateQueue: nil)
    }()

    func configure(_ config: PublicAuthConfiguration) throws {
        guard auth == nil else { return }
        try AppConfiguration.validate(config)
        auth = AuthClient(configuration: .init(
            url: AppConfiguration.authOrigin.appendingPathComponent("auth/v1"),
            headers: ["apikey": config.supabasePublishableKey],
            flowType: .pkce,
            redirectToURL: AppConfiguration.callback,
            storageKey: AppConfiguration.authStorageKey,
            localStorage: storage,
            fetch: { [network] request in
                guard let url = request.url, url.scheme == "https", url.host == AppConfiguration.authOrigin.host,
                      url.port == nil, url.user == nil, url.password == nil,
                      url.path.hasPrefix("/auth/v1/") else { throw AppFailure.configuration }
                return try await network.data(for: request)
            }
        ))
        // A killed attempt is retained only for a valid cold-start callback. An expired one
        // is discarded before another flow can use its verifier.
        if let pending = try storage.pending(), !pending.isValid() { try storage.clearAttempt() }
    }
    var hasStoredSession: Bool { auth?.currentSession != nil }
    var hasPendingAttempt: Bool { (try? storage.pending()?.isValid()) == true }
    var hasActiveSignIn: Bool { activeAttempt != nil || exchangeInFlight || hasPendingAttempt }
    var currentSubject: String? {
        guard let session = auth?.currentSession else { return nil }
        return String(describing: session.user.id).lowercased()
    }
    func hasPersistedSession() throws -> Bool { try storage.retrieve(key: AppConfiguration.authStorageKey) != nil }

    func deletionSession() async throws -> (bearer: String, subject: String) {
        guard let auth else { throw AppFailure.configuration }
        let session = try await auth.session
        return (session.accessToken, String(describing: session.user.id).lowercased())
    }

    func token() async throws -> String {
        guard let auth else { throw AppFailure.configuration }
        let session = try await auth.session // SDK refreshes an expired session before use.
        return session.accessToken
    }

    func signIn(provider: Provider) async throws {
        guard let auth, activeAttempt == nil, !exchangeInFlight else { throw AppFailure.configuration }
        try storage.clearAttempt()
        let attempt = PendingSignIn(id: UUID(), createdAt: Date(), kind: provider.rawValue, consumed: false)
        activeAttempt = attempt.id
        let currentGeneration = generation
        defer { if activeAttempt == attempt.id { activeAttempt = nil } }
        do {
            let url = try auth.getOAuthSignInURL(provider: provider, scopes: provider == .azure ? "email" : nil,
                                                 redirectTo: AppConfiguration.callback)
            // SDK stores the PKCE verifier through SecureStore. Fail closed if that write failed.
            guard try storage.retrieve(key: AppConfiguration.authStorageKey + "-code-verifier") != nil else { throw AppFailure.storage }
            try storage.storePending(attempt)
            let callback = try await browser.open(url)
            guard generation == currentGeneration else { throw AppFailure.cancelled }
            try await complete(callback)
        } catch {
            if generation == currentGeneration { try storage.clearAttempt() }
            throw error
        }
    }

    func beginApple(_ request: ASAuthorizationAppleIDRequest) throws {
        guard auth != nil, activeAttempt == nil, !exchangeInFlight else { throw AppFailure.configuration }
        try storage.clearAttempt()
        let attempt = try AppleSignInAttempt()
        appleAttempt = attempt; activeAttempt = attempt.id
        request.requestedScopes = [.email]
        request.nonce = attempt.hashedNonce
        request.state = attempt.id.uuidString
    }
    @discardableResult
    func completeApple(_ result: Result<ASAuthorization, Error>) async throws -> Bool {
        guard let auth, var attempt = appleAttempt, activeAttempt == attempt.id else { return false }
        appleAttempt = nil // One terminal native callback consumes this request, including failures.
        defer { if activeAttempt == attempt.id { activeAttempt = nil } }
        let authorization: ASAuthorization
        do { authorization = try result.get() }
        catch {
            if (error as? ASAuthorizationError)?.code == .canceled { throw AppFailure.cancelled }
            throw AppFailure.providerDeclined
        }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              credential.state == attempt.id.uuidString else { throw AppFailure.expiredAttempt }
        guard let data = credential.identityToken, let token = String(data: data, encoding: .utf8), !token.isEmpty else { throw AppFailure.invalidResponse }
        let nonce = try attempt.consume(state: credential.state)
        let currentGeneration = generation
        exchangeInFlight = true
        defer { exchangeInFlight = false; exchangeTask = nil }
        let task = Task { try await auth.signInWithIdToken(credentials: .init(provider: .apple, idToken: token, nonce: nonce)) }
        exchangeTask = task
        _ = try await task.value // Supabase validates signature, audience and nonce.
        guard generation == currentGeneration else {
            _ = try? await auth.signOut(scope: .local)
            try storage.remove(key: AppConfiguration.authStorageKey)
            throw AppFailure.cancelled
        }
        return true
    }

    func sendMagicLink(email: String) async throws {
        guard let auth, activeAttempt == nil, !exchangeInFlight else { throw AppFailure.configuration }
        try storage.clearAttempt()
        let attempt = PendingSignIn(id: UUID(), createdAt: Date(), kind: "email", consumed: false)
        let currentGeneration = generation
        activeAttempt = attempt.id
        defer { activeAttempt = nil }
        do {
            try await auth.signInWithOTP(email: email, redirectTo: AppConfiguration.callback)
            guard generation == currentGeneration else { throw AppFailure.cancelled }
            guard try storage.retrieve(key: AppConfiguration.authStorageKey + "-code-verifier") != nil else { throw AppFailure.storage }
            try storage.storePending(attempt)
        } catch {
            try storage.clearAttempt()
            throw error
        }
    }

    @discardableResult
    func complete(_ url: URL) async throws -> Bool {
        guard let auth else { throw AppFailure.configuration }
        // Validate before changing pending state. A foreign URL cannot cancel a legitimate flow.
        let code = try AppConfiguration.callbackCode(url)
        guard !exchangeInFlight else { return false }
        guard var pending = try storage.pending(), pending.isValid(),
              try storage.retrieve(key: AppConfiguration.authStorageKey + "-code-verifier") != nil else {
            throw AppFailure.expiredAttempt
        }
        // Consume BEFORE suspension. Duplicate warm/cold callbacks never exchange twice.
        pending.consumed = true
        try storage.storePending(pending)
        exchangeInFlight = true
        let exchangeGeneration = generation
        defer { exchangeInFlight = false; exchangeTask = nil }
        do {
            let task = Task { try await auth.exchangeCodeForSession(authCode: code) }
            exchangeTask = task
            _ = try await task.value
            guard generation == exchangeGeneration else {
                _ = try? await auth.signOut(scope: .local)
                try storage.remove(key: AppConfiguration.authStorageKey)
                throw AppFailure.cancelled
            }
            try storage.clearAttempt()
            return true
        } catch {
            try storage.clearAttempt()
            // A code is single-use; after an ambiguous network error start a fresh attempt.
            throw error
        }
    }
    func cancel() throws -> Bool {
        guard !exchangeInFlight, appleAttempt == nil else { return false }
        generation = UUID()
        browser.cancel()
        activeAttempt = nil
        appleAttempt = nil
        try storage.clearAttempt()
        return true
    }
    func signOut() async throws -> Bool {
        generation = UUID()
        browser.cancel()
        activeAttempt = nil
        appleAttempt = nil
        // Drain an in-flight exchange before declaring device sign-out complete. Otherwise
        // its late SDK write could recreate the session after Keychain was cleared.
        if let task = exchangeTask { task.cancel(); _ = try? await task.value }
        try storage.clearAttempt()
        var failure: Error?
        do { try await auth?.signOut(scope: .local) } catch { failure = error }
        // Clear device persistence even if remote revocation failed offline.
        try storage.remove(key: AppConfiguration.authStorageKey)
        try storage.clearAttempt()
        return failure == nil
    }
}


struct AppleSignInAttempt {
    let id: UUID
    let nonce: String
    let createdAt: Date
    private(set) var consumed = false
    init(id: UUID = UUID(), createdAt: Date = Date()) throws {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw AppFailure.storage }
        self.id = id; self.createdAt = createdAt
        nonce = bytes.map { String(format: "%02x", $0) }.joined()
    }
    var hashedNonce: String { SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined() }
    mutating func consume(state: String?, at now: Date = Date()) throws -> String {
        guard !consumed, state == id.uuidString, now >= createdAt, now.timeIntervalSince(createdAt) < 600 else { throw AppFailure.expiredAttempt }
        consumed = true
        return nonce
    }
}
