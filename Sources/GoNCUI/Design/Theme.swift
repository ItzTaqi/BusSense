import SwiftUI
import GoNCCore
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

extension Color {
    /// A color that switches with the light/dark scheme. Hex is 0xRRGGBB.
    init(light: UInt32, dark: UInt32) {
        func rgb(_ h: UInt32) -> (Double, Double, Double) { (Double((h >> 16) & 255) / 255, Double((h >> 8) & 255) / 255, Double(h & 255) / 255) }
        #if canImport(UIKit)
        self.init(UIColor { t in let c = rgb(t.userInterfaceStyle == .dark ? dark : light); return UIColor(red: c.0, green: c.1, blue: c.2, alpha: 1) })
        #else
        self.init(NSColor(name: nil) { a in
            let isDark = a.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            let c = rgb(isDark ? dark : light); return NSColor(red: c.0, green: c.1, blue: c.2, alpha: 1)
        })
        #endif
    }
    init(hex: UInt32) { self.init(light: hex, dark: hex) }
}

/// GoNC design tokens: white surfaces, blue accent, one red for destructive actions. Status is never color alone:
/// every status uses an icon + text + fill style. See design/DESIGN.md.
public enum GN {
    public static let bg = Color(light: 0xFFFFFF, dark: 0x0B1430)
    public static let card = Color(light: 0xFFFFFF, dark: 0x111D42)
    public static let cardAlt = Color(light: 0xEAF0FF, dark: 0x1B2A5C)
    public static let ink = Color(light: 0x050A1A, dark: 0xFFFFFF)
    public static let sub = Color(light: 0x3B4766, dark: 0xC0CCF2)
    public static let line = Color(light: 0xC3D1F2, dark: 0x2E4283)
    public static let brand = Color(light: 0x0F46E6, dark: 0x6B96FF)
    public static let onBrand = Color(light: 0xFFFFFF, dark: 0x03102E)
    public static let danger = Color(light: 0xB3123A, dark: 0xFF8FA6)
    public static let heroA = Color(light: 0x061A66, dark: 0x0B1F73)
    public static let heroB = Color(light: 0x0F46E6, dark: 0x2F5FFF)

    public static let radius: CGFloat = 16
    public static let heroGradient = LinearGradient(colors: [heroA, heroB], startPoint: .topLeading, endPoint: .bottomTrailing)
}

extension Appearance {
    /// nil = follow the device.
    var colorScheme: ColorScheme? { switch self { case .system: return nil; case .light: return .light; case .dark: return .dark } }
}

/// Plus Jakarta Sans is used on the home page only. Registered from the package bundle at launch.
public enum GNFont {
    public static func register() {
        for name in ["PlusJakartaSans-Medium", "PlusJakartaSans-Bold", "PlusJakartaSans-ExtraBold"] {
            guard let url = Bundle.module.url(forResource: name, withExtension: "ttf", subdirectory: "Fonts") ?? Bundle.module.url(forResource: name, withExtension: "ttf") else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
    public static func jakarta(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        let name = weight == .heavy || weight == .black ? "PlusJakartaSans-ExtraBold" : weight == .medium || weight == .regular ? "PlusJakartaSans-Medium" : "PlusJakartaSans-Bold"
        return .custom(name, size: size)
    }
}
