import Foundation
import Security

/// Tiny on-device key/value store. The Keychain on phones; memory for tests and previews. Never throws.
public protocol KeyValueStore: Sendable {
    func get(_ key: String) -> String?
    func set(_ value: String, for key: String)
    func remove(_ key: String)
}

public final class KeychainStore: KeyValueStore, @unchecked Sendable {
    private let service: String
    public init(service: String = "app.gonc") { self.service = service }
    private func query(_ key: String) -> [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key] }
    public func get(_ key: String) -> String? {
        var q = query(key); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    public func set(_ value: String, for key: String) {
        remove(key)
        var q = query(key); q[kSecValueData as String] = Data(value.utf8); q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(q as CFDictionary, nil)
    }
    public func remove(_ key: String) { SecItemDelete(query(key) as CFDictionary) }
}

public final class MemoryStore: KeyValueStore, @unchecked Sendable {
    private let lock = NSLock(); private var values: [String: String] = [:]
    public init() {}
    public func get(_ key: String) -> String? { lock.lock(); defer { lock.unlock() }; return values[key] }
    public func set(_ value: String, for key: String) { lock.lock(); values[key] = value; lock.unlock() }
    public func remove(_ key: String) { lock.lock(); values[key] = nil; lock.unlock() }
}
