import Foundation

/// Bus times -> sensing windows. Riders say when the bus usually comes and when it leaves school; the app only
/// listens in a window around those times (time-boxed sensing).
public enum Times {
    private static func pad(_ n: Int) -> String { n < 10 ? "0\(n)" : "\(n)" }

    /// "7:05 AM" for a minute-of-day.
    public static func label(_ min: Int) -> String {
        let h24 = min / 60, m = min % 60
        let h = ((h24 + 11) % 12) + 1
        return "\(h):\(pad(m)) \(h24 < 12 ? "AM" : "PM")"
    }
    /// Options every `step` minutes from `from` to `to` inclusive.
    public static func options(from: Int, to: Int, step: Int = 5) -> [String] {
        stride(from: from, through: to, by: step).map(label)
    }
    /// "7:05 AM" -> minute-of-day, or nil.
    public static func parse(_ s: String) -> Int? {
        let parts = s.split(separator: " ")
        guard parts.count == 2, let ampm = ["AM", "PM"].first(where: { $0 == parts[1] }) else { return nil }
        let hm = parts[0].split(separator: ":")
        guard hm.count == 2, hm[1].count == 2, let h = Int(hm[0]), let m = Int(hm[1]), (1...12).contains(h), (0...59).contains(m) else { return nil }
        return (h % 12 + (ampm == "PM" ? 12 : 0)) * 60 + m
    }
    public static func hhmm(_ min: Int) -> String { "\(pad(min / 60)):\(pad(min % 60))" }

    public static let morningOptions = options(from: 5 * 60, to: 10 * 60)      // bus comes: 5:00 AM - 10:00 AM
    public static let afternoonOptions = options(from: 11 * 60, to: 18 * 60)   // bus leaves school: 11:00 AM - 6:00 PM

    public struct Windows: Equatable, Sendable { public let amStart, amEnd, pmStart, pmEnd: String }

    /// Window = 15 min before the morning pickup to 60 min after; 10 min before dismissal to 75 min after.
    public static func windows(pickup: Int, leave: Int) -> Windows {
        func clamp(_ m: Int) -> Int { min(max(m, 0), 24 * 60 - 1) }
        return Windows(amStart: hhmm(clamp(pickup - 15)), amEnd: hhmm(clamp(pickup + 60)),
                       pmStart: hhmm(clamp(leave - 10)), pmEnd: hhmm(clamp(leave + 75)))
    }

    /// Student ID (e.g. PowerSchool number): digits only, 5-12 long.
    public static func isStudentID(_ s: String) -> Bool {
        let t = s.trimmingCharacters(in: .whitespaces)
        return (5...12).contains(t.count) && t.allSatisfy { $0.isASCII && $0.isNumber }
    }
}
