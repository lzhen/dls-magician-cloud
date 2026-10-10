import AuthenticationServices
import UIKit

@MainActor
final class AuthenticationBrowser: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var activeSession: ASWebAuthenticationSession?
    private var continuation: CheckedContinuation<URL, Error>?
    private var anchor: UIWindow?
    private var callbackGate = AuthenticationCallbackGate()

    func open(_ url: URL) async throws -> URL {
        guard AppConfiguration.authorizationURLIsAllowed(url), activeSession == nil else { throw AppFailure.configuration }
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .filter({ $0.activationState == .foregroundActive })
            .flatMap(\.windows).first(where: \.isKeyWindow) else { throw AppFailure.noWindow }
        anchor = window
        let id = callbackGate.begin()
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: AppConfiguration.callback.scheme) { [weak self] url, error in
                Task { @MainActor in
                    if let url { self?.finish(.success(url), id: id) }
                    else if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                        self?.finish(.failure(AppFailure.cancelled), id: id)
                    } else { self?.finish(.failure(AppFailure.providerDeclined), id: id) }
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            activeSession = session
            if !session.start() { finish(.failure(AppFailure.noWindow), id: id) }
        }
    }
    func cancel() {
        guard let id = callbackGate.currentID else { return }
        activeSession?.cancel()
        finish(.failure(AppFailure.cancelled), id: id)
    }
    private func finish(_ result: Result<URL, Error>, id: UUID) {
        guard callbackGate.finish(id: id) else { return }
        let saved = continuation
        continuation = nil
        activeSession = nil
        anchor = nil
        saved?.resume(with: result)
    }
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // An active session always has the actual presenting window captured above.
        anchor ?? ASPresentationAnchor()
    }
}
