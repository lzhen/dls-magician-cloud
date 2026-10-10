import Foundation
import Security
import Auth

struct SecureStore: AuthLocalStorage {
    private let service = "design.zhenli.dlsmagician.native-auth"
    private func query(_ key: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service, kSecAttrAccount as String: key]
    }
    func store(key: String, value: Data) throws {
        let attributes: [String: Any] = [kSecValueData as String: value,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let update = SecItemUpdate(query(key) as CFDictionary, attributes as CFDictionary)
        if update == errSecItemNotFound {
            let create = query(key).merging(attributes) { _, new in new }
            guard SecItemAdd(create as CFDictionary, nil) == errSecSuccess else { throw AppFailure.storage }
        } else if update != errSecSuccess { throw AppFailure.storage }
    }
    func retrieve(key: String) throws -> Data? {
        var query = query(key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw AppFailure.storage }
        return data
    }
    func remove(key: String) throws {
        let status = SecItemDelete(query(key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw AppFailure.storage }
    }
    func pending() throws -> PendingSignIn? {
        guard let data = try retrieve(key: AppConfiguration.pendingKey) else { return nil }
        return try JSONDecoder().decode(PendingSignIn.self, from: data)
    }
    func storePending(_ value: PendingSignIn) throws {
        try store(key: AppConfiguration.pendingKey, value: JSONEncoder().encode(value))
    }
    func clearAttempt() throws {
        try remove(key: AppConfiguration.pendingKey)
        try remove(key: AppConfiguration.authStorageKey + "-code-verifier")
    }
}
