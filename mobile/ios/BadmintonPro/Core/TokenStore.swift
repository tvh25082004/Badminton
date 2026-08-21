import Foundation
import Security

/// Lưu token trong Keychain (không dùng UserDefaults cho dữ liệu nhạy cảm).
enum TokenStore {
    private static let service = "vn.caulongpro.app"
    private static let accessAccount = "bm_access"
    private static let refreshAccount = "bm_refresh"

    struct Tokens {
        let access: String
        let refresh: String
    }

    static func read(_ account: String) -> String? {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    static func write(_ account: String, value: String) -> Bool {
        let data = value.data(using: .utf8) ?? Data()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        let attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        return SecItemAdd(attributes as CFDictionary, nil) == errSecSuccess
    }

    static func delete(_ account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }

    static func save(_ tokens: Tokens) {
        write(accessAccount, value: tokens.access)
        write(refreshAccount, value: tokens.refresh)
    }

    static func current() -> Tokens? {
        guard let access = read(accessAccount), let refresh = read(refreshAccount) else { return nil }
        return Tokens(access: access, refresh: refresh)
    }

    static func clear() {
        delete(accessAccount)
        delete(refreshAccount)
    }
}
