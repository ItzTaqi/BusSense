import Foundation

/// Past rides live ONLY on the rider's phone. The server keeps trips anonymous (no user id), so it cannot list "my" trips.
public struct Ride: Identifiable, Equatable, Codable, Sendable {
    public var id: String
    public var startedAt: Date
    public var endedAt: Date
    public var bus: String
    public var published: Bool?     // nil = the receipt could not be fetched
    public var maxRiders: Int?
    public init(id: String, startedAt: Date, endedAt: Date, bus: String, published: Bool?, maxRiders: Int?) {
        self.id = id; self.startedAt = startedAt; self.endedAt = endedAt; self.bus = bus; self.published = published; self.maxRiders = maxRiders
    }

    public static let maxKept = 50

    /// Newest first, capped, no duplicate ids.
    public static func adding(_ ride: Ride, to list: [Ride], max: Int = maxKept) -> [Ride] {
        Array(([ride] + list.filter { $0.id != ride.id }).sorted { $0.startedAt > $1.startedAt }.prefix(max))
    }
    public var durationMin: Int { Swift.max(1, Int((endedAt.timeIntervalSince(startedAt) / 60).rounded())) }

    public var outcomeText: String {
        guard let published else { return "Receipt unavailable" }
        if published { if let n = maxRiders, n > 0 { return "Shared with \(n) riders" }; return "Shared with other riders" }
        return "Not shown: fewer than 3 riders"
    }
    public func title(now: Date = Date(), calendar: Calendar = .current) -> String {
        let day: String
        if calendar.isDate(startedAt, inSameDayAs: now) { day = "Today" }
        else if calendar.isDate(startedAt, inSameDayAs: calendar.date(byAdding: .day, value: -1, to: now)!) { day = "Yesterday" }
        else { let f = DateFormatter(); f.calendar = calendar; f.dateFormat = "EEE, MMM d"; day = f.string(from: startedAt) }
        let t = DateFormatter(); t.calendar = calendar; t.timeStyle = .short; t.dateStyle = .none
        return "\(day), \(t.string(from: startedAt))"
    }
}
