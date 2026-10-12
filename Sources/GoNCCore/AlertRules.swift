import Foundation

/// Alert rules (section 8 of the brief) as pure functions so they can be tested without any push infrastructure.
public enum AlertRules {
    public struct Status: Sendable { public var source: BusSource; public var etaLo: Double?; public var ageMin: Double
        public init(source: BusSource, etaLo: Double?, ageMin: Double) { self.source = source; self.etaLo = etaLo; self.ageMin = ageMin } }
    public struct Prefs: Sendable { public var walkMin: Int; public var quietNow: Bool; public var lastPushMinAgoForStop: Double?; public var alreadySentLeaveNow: Bool
        public init(walkMin: Int, quietNow: Bool, lastPushMinAgoForStop: Double?, alreadySentLeaveNow: Bool) {
            self.walkMin = walkMin; self.quietNow = quietNow; self.lastPushMinAgoForStop = lastPushMinAgoForStop; self.alreadySentLeaveNow = alreadySentLeaveNow } }
    public enum Decision: Equatable, Sendable { case none; case send(kind: String, text: String)
        public var sends: Bool { if case .send = self { return true }; return false } }

    /// At most 1 push per stop per 5 minutes, and none in quiet hours.
    static func blocked(quiet: Bool, lastPushMinAgo: Double?) -> Bool { quiet || (lastPushMinAgo.map { $0 < 5 } ?? false) }

    public static func leaveNow(_ s: Status, _ p: Prefs) -> Decision {
        guard !blocked(quiet: p.quietNow, lastPushMinAgo: p.lastPushMinAgoForStop), !p.alreadySentLeaveNow, let etaLo = s.etaLo else { return .none }
        if etaLo - Double(p.walkMin) - 2 > 0 { return .none }
        if s.source == .live || (s.source == .recent && s.ageMin < 3) { return .send(kind: "leave_now", text: "Time to head out to your stop.") }
        if s.source == .estimate { return .send(kind: "leave_now_estimate", text: "Time to head out (estimate).") }
        return .none
    }

    /// Running late: >= 7 min over median for 2 consecutive refreshes; clears below 4; 10 min cooldown.
    public struct LateState: Equatable, Sendable { public var active = false; public var consecutiveOver = 0; public var minSinceLastPush: Double? = nil
        public init(active: Bool = false, consecutiveOver: Int = 0, minSinceLastPush: Double? = nil) { self.active = active; self.consecutiveOver = consecutiveOver; self.minSinceLastPush = minSinceLastPush } }

    public static func runningLate(lateMin: Double, state st: LateState, quietNow: Bool, lastPushMinAgo: Double?) -> (state: LateState, decision: Decision) {
        var next = st
        next.consecutiveOver = lateMin >= 7 ? st.consecutiveOver + 1 : 0
        if st.active && lateMin < 4 { next.active = false }
        let cooled = st.minSinceLastPush.map { $0 >= 10 } ?? true
        if !st.active && next.consecutiveOver >= 2 && cooled && !blocked(quiet: quietNow, lastPushMinAgo: lastPushMinAgo) {
            next.active = true
            return (next, .send(kind: "running_late", text: "Running about \(Int(lateMin.rounded())) min later than usual."))
        }
        return (next, .none)
    }

    /// Not seen yet: usual pickup + 10 min with no LIVE/RECENT track.
    public static func notSeenYet(minPastUsual: Double, hasLiveOrRecent: Bool, quietNow: Bool, lastPushMinAgo: Double?) -> Decision {
        if blocked(quiet: quietNow, lastPushMinAgo: lastPushMinAgo) || hasLiveOrRecent || minPastUsual < 10 { return .none }
        return .send(kind: "not_seen", text: "Your bus hasn't been seen yet. Check https://busupdates.wcpss.net")
    }

    /// Passed your stop: LIVE centroid is >= 100 m past the stop along the route.
    public static func passedStop(metersPast: Double, source: BusSource, quietNow: Bool, lastPushMinAgo: Double?) -> Decision {
        if blocked(quiet: quietNow, lastPushMinAgo: lastPushMinAgo) || source != .live || metersPast < 100 { return .none }
        return .send(kind: "passed_stop", text: "The bus has passed your stop.")
    }

    /// Quiet hours as "HH:MM" strings; works across midnight (e.g. 21:00 -> 06:30). Start == end means no quiet hours.
    public static func isQuiet(now: String, start: String?, end: String?) -> Bool {
        guard let start, let end, start != end else { return false }
        return start < end ? (now >= start && now < end) : (now >= start || now < end)
    }
    /// Per-alert switches saved from the app (all default to on).
    public static func alertEnabled(_ prefs: [String: Bool]?, key: String) -> Bool { prefs?[key] != false }
}
