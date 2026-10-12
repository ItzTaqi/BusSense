import Foundation

/// Follow the phone ("system") or force light/dark.
public enum Appearance: String, CaseIterable, Codable, Sendable {
    case system, light, dark

    public enum Scheme: Sendable { case light, dark }

    /// The scheme to draw with. `system` follows the device and falls back to light when the device doesn't say.
    public static func resolve(_ pref: Appearance, system: Scheme?) -> Scheme {
        switch pref {
        case .system: return system == .dark ? .dark : .light
        case .light: return .light
        case .dark: return .dark
        }
    }
}
