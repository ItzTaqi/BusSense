import Foundation

/// Week-by-week view of anonymous parent reports. Weeks run Monday to Sunday in the phone's local time.
public enum Weekly {
    public static func calendar(_ base: Calendar = .current) -> Calendar { var c = base; c.firstWeekday = 2; c.minimumDaysInFirstWeek = 4; return c }

    public static func weekStart(_ date: Date, calendar: Calendar = .current) -> Date {
        let c = Weekly.calendar(calendar)
        return c.dateInterval(of: .weekOfYear, for: date)!.start
    }

    public struct WeekOption: Equatable, Sendable { public let offset: Int; public let start: Date; public let end: Date; public let label: String }

    private static func fmt(_ d: Date, _ cal: Calendar) -> String {
        let f = DateFormatter(); f.calendar = cal; f.locale = Locale(identifier: "en_US"); f.dateFormat = "MMM d"; return f.string(from: d)
    }

    /// This week first, then each earlier week. Labels are unique so they can be used as picker values.
    public static func options(now: Date = Date(), count: Int = 8, calendar: Calendar = .current) -> [WeekOption] {
        let cal = Weekly.calendar(calendar)
        let thisMonday = weekStart(now, calendar: cal)
        return (0..<count).map { offset in
            let start = cal.date(byAdding: .day, value: -7 * offset, to: thisMonday)!
            let end = cal.date(byAdding: .day, value: 6, to: start)!
            let range = "\(fmt(start, cal)) – \(fmt(end, cal))"
            let name = offset == 0 ? "This week" : offset == 1 ? "Last week" : nil
            return WeekOption(offset: offset, start: start, end: end, label: name.map { "\($0) (\(range))" } ?? range)
        }
    }

    public struct Day: Equatable, Identifiable, Sendable { public var id: String { key }; public let key: String; public let label: String; public var noShow: Int; public var early: Int }

    /// Monday to Friday always; Saturday and Sunday only when they have reports.
    public static func daily(_ reports: [Report], weekStart start: Date, calendar: Calendar = .current) -> [Day] {
        let cal = Weekly.calendar(calendar)
        let end = cal.date(byAdding: .day, value: 7, to: start)!
        let f = DateFormatter(); f.calendar = cal; f.locale = Locale(identifier: "en_US"); f.dateFormat = "EEE, MMM d"
        var days: [Day] = (0..<7).map { i in
            let d = cal.date(byAdding: .day, value: i, to: start)!
            return Day(key: f.string(from: d), label: f.string(from: d), noShow: 0, early: 0)
        }
        for r in reports where r.t >= start && r.t < end {
            let i = cal.dateComponents([.day], from: cal.startOfDay(for: start), to: cal.startOfDay(for: r.t)).day ?? -1
            guard (0..<7).contains(i) else { continue }
            if r.kind == .early { days[i].early += 1 } else { days[i].noShow += 1 }
        }
        return days.enumerated().filter { $0.offset < 5 || $0.element.noShow + $0.element.early > 0 }.map(\.element)
    }

    public static func totals(_ days: [Day]) -> (noShow: Int, early: Int) {
        (days.reduce(0) { $0 + $1.noShow }, days.reduce(0) { $0 + $1.early })
    }
}
