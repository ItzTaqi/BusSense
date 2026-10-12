import Foundation
import GoNCCore

/// One parent following one bus at one stop. No child name, no location: just what is needed to send an alert.
public struct Follow: Sendable, Equatable {
    public var followerId: String, routeLabel: String, stopId: String, walkMin: Int, pushToken: String?, alertPrefs: [String: String]
    public init(followerId: String, routeLabel: String, stopId: String, walkMin: Int, pushToken: String?, alertPrefs: [String: String]) {
        self.followerId = followerId; self.routeLabel = routeLabel; self.stopId = stopId; self.walkMin = walkMin; self.pushToken = pushToken; self.alertPrefs = alertPrefs
    }
}
public protocol PushSender: Sendable { func send(token: String, title: String, body: String) async throws }

/// Turns bus_status changes into pushes using the alert rules. Today only "Leave now" is wired; the other rules exist in
/// `AlertRules` and are tested, and need per-stop history before they can be switched on.
public actor PushDispatcher {
    private var lastPush: [String: Date] = [:]          // per follower+stop: at most 1 push per 5 minutes
    private var leaveNowSent: Set<String> = []          // once per trip per follower+stop
    private let sender: PushSender
    private let timeZone: TimeZone
    public init(sender: PushSender, timeZone: TimeZone = TimeZone(identifier: "America/New_York")!) { self.sender = sender; self.timeZone = timeZone }

    /// Returns how many pushes were sent.
    @discardableResult
    public func process(status: StatusWrite, follows: [Follow], statusAgeMin: Double = 0, now: Date = Date()) async -> Int {
        var sent = 0
        var cal = Calendar(identifier: .gregorian); cal.timeZone = timeZone
        let hhmm = String(format: "%02d:%02d", cal.component(.hour, from: now), cal.component(.minute, from: now))
        for f in follows where f.routeLabel == status.routeLabel && f.stopId == status.stopId {
            guard let token = f.pushToken else { continue }
            let prefs = f.alertPrefs.mapValues { $0 == "true" ? true : $0 == "false" ? false : true }
            guard AlertRules.alertEnabled(prefs, key: "leave_now") else { continue }
            let key = "\(f.followerId)|\(f.routeLabel)|\(f.stopId)"
            let quiet = AlertRules.isQuiet(now: hhmm, start: f.alertPrefs["quiet_start"], end: f.alertPrefs["quiet_end"])
            let agoMin = lastPush[key].map { now.timeIntervalSince($0) / 60 }
            let decision = AlertRules.leaveNow(.init(source: status.source, etaLo: status.etaLo, ageMin: statusAgeMin),
                                               .init(walkMin: f.walkMin, quietNow: quiet, lastPushMinAgoForStop: agoMin, alreadySentLeaveNow: leaveNowSent.contains(key)))
            guard case .send(let kind, let text) = decision else { continue }
            do { try await sender.send(token: token, title: "GoNC", body: text); sent += 1; lastPush[key] = now; if kind.hasPrefix("leave_now") { leaveNowSent.insert(key) } }
            catch { /* a failed push is simply not recorded, so the next status change can try again */ }
        }
        return sent
    }
    /// Call when a bus is no longer seen so the next trip can alert again.
    public func resetTrip(routeLabel: String) { leaveNowSent = leaveNowSent.filter { !$0.contains("|\(routeLabel)|") } }
}

/// Weekly AI report. The summarizer only ever receives aggregate counts. Written once per route per week.
public protocol Summarizer: Sendable { func summarize(_ insights: Insights) async throws -> String }

public enum SummaryPrompt {
    /// Only counts. No names, locations, ids or free text.
    public static func text(_ i: Insights) -> String {
        let facts = "weeks=\(i.weeks), didnt_come_total=\(i.totalNoShow), came_early_total=\(i.totalEarly), didnt_come_this_week=\(i.thisWeek), didnt_come_last_week=\(i.lastWeek), most_reports_on=\(i.worstDay ?? "none")"
        return "Write a calm two-sentence weekly summary of this school bus's reliability for a parent. Use only these counts of parent reports. Do not guess causes and do not claim certainty. Counts: \(facts)"
    }
}
