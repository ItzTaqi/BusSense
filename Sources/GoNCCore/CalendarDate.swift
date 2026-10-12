import Foundation

/// A birthday or other calendar date. The full birth date stays on the phone; only the birth YEAR is ever uploaded.
public struct YMD: Equatable, Hashable, Codable, Sendable {
    public var y: Int
    public var m: Int   // 1-12
    public var d: Int
    public init(y: Int, m: Int, d: Int) { self.y = y; self.m = m; self.d = d }

    public static let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    private static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = .current; return c }

    public static func daysInMonth(year: Int, month: Int) -> Int {
        let start = cal.date(from: DateComponents(year: year, month: month, day: 1))!
        return cal.range(of: .day, in: .month, for: start)!.count
    }
    /// 0 = Sunday.
    public static func firstWeekday(year: Int, month: Int) -> Int {
        let start = cal.date(from: DateComponents(year: year, month: month, day: 1))!
        return cal.component(.weekday, from: start) - 1
    }
    public var formatted: String { String(format: "%02d/%02d/%04d", m, d, y) }

    public func age(on today: Date = Date()) -> Int {
        let c = Self.cal.dateComponents([.year, .month, .day], from: today)
        var age = c.year! - y
        if c.month! < m || (c.month! == m && c.day! < d) { age -= 1 }
        return age
    }
    public func isFuture(_ today: Date = Date()) -> Bool {
        guard let date = Self.cal.date(from: DateComponents(year: y, month: m, day: d)) else { return true }
        return date > today
    }
}

/// COPPA: under 13 cannot enable location sensing.
public enum Eligibility {
    public static let minRiderAge = 13
    public static func isEligibleRider(_ dob: YMD, today: Date = Date()) -> Bool { dob.age(on: today) >= minRiderAge }
    public static let ineligibleTitle = "Sorry, you're not eligible"
    public static let ineligibleBody = "To protect your privacy, riders must be 13 or older to share their bus location. We haven't saved your birthday or any information. A parent or guardian can still follow your bus in Parent mode."
}
