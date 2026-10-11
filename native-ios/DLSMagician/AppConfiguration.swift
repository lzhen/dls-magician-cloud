import Foundation

enum AppConfiguration {
    static let bundleID = "design.zhenli.dlsmagician"
    static let apiOrigin = URL(string: "https://dlsmagician.empathie.ai")!
    static let authOrigin = URL(string: "https://vxlwnvwijnzimjvgpeug.supabase.co")!
    static let callback = URL(string: "design.zhenli.dlsmagician://auth/callback")!
    static let authStorageKey = "dls-native-session-v1"
    static let pendingKey = "dls-native-auth-pending-v1"

    static func validate(_ config: PublicAuthConfiguration) throws {
        guard config.supabaseUrl == authOrigin.absoluteString,
              config.supabasePublishableKey.hasPrefix("sb_publishable_"),
              !config.supabasePublishableKey.contains(where: { $0.isWhitespace }) else {
            throw AppFailure.configuration
        }
    }

    static func authorizationURLIsAllowed(_ url: URL) -> Bool {
        url.scheme == "https" && url.host == authOrigin.host && url.port == nil &&
        url.user == nil && url.password == nil && url.path == "/auth/v1/authorize" &&
        url.fragment == nil
    }

    static func callbackCode(_ url: URL) throws -> String {
        guard url.scheme == callback.scheme, url.host == callback.host,
              url.path == callback.path, url.port == nil, url.user == nil,
              url.password == nil,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw AppFailure.callbackDestination
        }
        let query = components.queryItems ?? []
        var fragmentComponents = URLComponents()
        fragmentComponents.percentEncodedQuery = components.percentEncodedFragment
        let fragment = fragmentComponents.queryItems ?? []
        let all = query + fragment
        let tokenNames = ["access_token", "refresh_token", "token", "token_hash", "provider_token", "provider_refresh_token", "id_token"]
        guard !all.contains(where: { tokenNames.contains($0.name.lowercased()) }) else {
            throw AppFailure.callbackTokens
        }
        // Supabase reports errors in the fragment, sometimes duplicated in the query.
        // Never show error_description or any untrusted URL value to the user.
        if all.contains(where: { ["error", "error_code", "error_description"].contains($0.name) }) {
            if all.contains(where: { $0.name == "error_code" && $0.value == "otp_expired" }) {
                throw AppFailure.emailLinkExpired
            }
            throw AppFailure.providerDeclined
        }
        // A bare # or the empty Supabase marker carries no credentials. Other fragments
        // remain rejected; authorization still requires exactly one query code + PKCE.
        guard fragment.allSatisfy({ $0.name == "sb" && ($0.value ?? "").isEmpty }), fragment.count <= 1 else {
            throw AppFailure.callbackFragment
        }
        let codes = query.filter { $0.name == "code" }
        guard codes.count == 1, let code = codes[0].value, !code.isEmpty, code.count < 4096 else {
            throw AppFailure.callbackCodeMissing
        }
        return code
    }

}

enum AppFailure: LocalizedError, Equatable {
    case configuration, invalidCallback, expiredAttempt, providerDeclined, cancelled
    case callbackDestination, callbackTokens, callbackFragment, callbackCodeMissing, emailLinkExpired
    case unauthorized, forbidden, conflict, unavailable, invalidResponse, storage, noWindow
    var errorDescription: String? {
        switch self {
        case .configuration: return "The sign-in configuration could not be verified. Please try again later."
        case .callbackDestination: return "Sign-in returned to an unexpected app address. Please report DLS-AUTH-01."
        case .callbackTokens: return "Sign-in returned an unsupported response. Please report DLS-AUTH-02."
        case .callbackFragment: return "Sign-in returned an unexpected response format. Please report DLS-AUTH-03."
        case .callbackCodeMissing: return "Sign-in did not return a usable confirmation code. Please report DLS-AUTH-04."
        case .emailLinkExpired: return "The email sign-in link has expired or was already used. Request one new link from this app and open it on this iPhone."
        case .invalidCallback: return "This sign-in link is not valid for DLS Magician."
        case .expiredAttempt: return "This sign-in attempt expired. Please start again."
        case .providerDeclined: return "Sign-in was not completed. You can try again."
        case .cancelled: return "Sign-in cancelled."
        case .unauthorized: return "Your session expired. Please sign in again."
        case .forbidden: return "Your account does not have permission to make this change."
        case .conflict: return "This project changed on the server. Your draft is safe. Review the latest version before saving."
        case .unavailable: return "We could not reach your workspace. Check your connection and retry."
        case .invalidResponse: return "The workspace returned an unexpected response. Please retry."
        case .storage: return "Your device could not save this securely. Please try again."
        case .noWindow: return "Sign-in could not open. Please return to the app and try again."
        }
    }
}

func userMessage(_ error: Error) -> String {
    // Do not display raw SDK/network errors: they can contain request URLs or auth data.
    (error as? AppFailure)?.localizedDescription ?? AppFailure.unavailable.localizedDescription
}
