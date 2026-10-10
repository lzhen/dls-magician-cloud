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
              url.password == nil, url.fragment == nil,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw AppFailure.invalidCallback
        }
        let query = components.queryItems ?? []
        guard !query.contains(where: { ["access_token", "refresh_token", "token"].contains($0.name) }) else {
            throw AppFailure.invalidCallback
        }
        if query.contains(where: { $0.name == "error" || $0.name == "error_code" }) {
            throw AppFailure.providerDeclined
        }
        let codes = query.filter { $0.name == "code" }
        guard codes.count == 1, let code = codes[0].value, !code.isEmpty, code.count < 4096 else {
            throw AppFailure.invalidCallback
        }
        return code
    }
}

enum AppFailure: LocalizedError, Equatable {
    case configuration, invalidCallback, expiredAttempt, providerDeclined, cancelled
    case unauthorized, forbidden, conflict, unavailable, invalidResponse, storage, noWindow
    var errorDescription: String? {
        switch self {
        case .configuration: return "The sign-in configuration could not be verified. Please try again later."
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
