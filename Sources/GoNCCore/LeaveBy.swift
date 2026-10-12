import Foundation

/// Honest source badge: always shown as text.
public enum BusSource: String, Codable, Sendable {
    case live = "LIVE", recent = "RECENT", estimate = "ESTIMATE", noData = "NO_DATA"
    public var label: String { self == .noData ? "NO DATA" : rawValue }
}

public enum LeaveBy {
    /// Minutes until the family should leave: eta_lo minus the walk minus a 2 minute cushion, never negative.
    public static func minutes(etaLo: Double?, walkMin: Int) -> Int? {
        guard let etaLo else { return nil }
        return max(0, Int((etaLo - Double(walkMin) - 2).rounded(.down)))
    }
}
