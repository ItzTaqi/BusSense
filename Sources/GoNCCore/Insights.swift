import Foundation

/// An anonymous parent report. The data holds no user id.
public struct Report: Equatable, Codable, Sendable {
    public enum Kind: String, Codable, Sendable { case noShow = "no_show", early }
    public var kind: Kind
    public var t: Date
    public init(kind: Kind, t: Date) { self.kind = kind; self.t = t }
}

/// Weekly insights computed on the phone from anonymous parent reports.
public struct Insights: Equatable, Codable, Sendable {
    public enum Trend: String, Codable, Sendable { case up, down, flat, none }
    public var weeks: Int
    public var totalNoShow: Int
    public var totalEarly: Int
    public var thisWeek: Int
    public var lastWeek: Int
    public var trend: Trend
    public var worstDay: String?
    public var series: [Int]        // "didn't come" per week, oldest -> newest

    public static let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    private static let weekSeconds: TimeInterval = 7 * 24 * 3600

    public static func compute(_ reports: [Report], weeks: Int = 4, now: Date = Date(), calendar: Calendar = .current) -> Insights {
        var series = [Int](repeating: 0, count: weeks)
        var byDay = [Int](repeating: 0, count: 7)
        var noShow = 0, early = 0
        for r in reports {
            let age = now.timeIntervalSince(r.t)
            if age < 0 || age >= Double(weeks) * weekSeconds { continue }
            if r.kind == .early { early += 1; continue }
            noShow += 1
            series[weeks - 1 - Int(age / weekSeconds)] += 1
            byDay[calendar.component(.weekday, from: r.t) - 1] += 1
        }
        let thisWeek = series.last ?? 0
        let lastWeek = series.count >= 2 ? series[series.count - 2] : 0
        let trend: Trend = noShow == 0 ? .none : thisWeek > lastWeek ? .up : thisWeek < lastWeek ? .down : .flat
        let worst = byDay.max() ?? 0
        return Insights(weeks: weeks, totalNoShow: noShow, totalEarly: early, thisWeek: thisWeek, lastWeek: lastWeek, trend: trend,
                        worstDay: worst > 0 ? weekdays[byDay.firstIndex(of: worst)!] : nil, series: series)
    }

    public var trendText: String {
        switch trend {
        case .none: return "No reports yet"
        case .up: return "Up from \(lastWeek) last week"
        case .down: return "Down from \(lastWeek) last week"
        case .flat: return "Same as last week"
        }
    }
}
