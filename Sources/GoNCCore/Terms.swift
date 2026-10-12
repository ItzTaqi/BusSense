import Foundation

/// Bump `termsVersion` whenever the Privacy and Terms text changes materially; everyone is asked to agree again.
public enum Terms {
    public static let version = "2026-10-12"
    public static func needsAgreement(stored: String?) -> Bool { stored != version }
}
