import Foundation
import Logging
import PostgresNIO
import GoNCCore
import GoNCEngine

/// The dispatcher's database access. Connect with the `goyellow_dispatch` role: it can read follows/followers (bus, stop, walk
/// minutes, push token, alert prefs), bus_status and reports, and write weekly summaries. It cannot read riders or trip_points.
struct DispatchStore {
    let client: PostgresClient
    let log: Logger

    func changedStatuses(since: Double) async throws -> [(status: StatusWrite, updatedAt: Double)] {
        let rows = try await client.query("""
            SELECT route_label, stop_id, stops_away, eta_min::float8, eta_lo::float8, eta_hi::float8, source, extract(epoch from updated_at)::float8
            FROM bus_status WHERE updated_at > to_timestamp(\(since)::float8)
            """, logger: log)
        var out: [(StatusWrite, Double)] = []
        for try await (route, stop, away, eta, lo, hi, source, at) in rows.decode((String, String, Int?, Double?, Double?, Double?, String, Double).self) {
            out.append((StatusWrite(routeLabel: route, stopId: stop, stopsAway: away, etaMin: eta, etaLo: lo, etaHi: hi, source: BusSource(rawValue: source) ?? .noData), at))
        }
        return out
    }

    func follows(route: String, stop: String) async throws -> [Follow] {
        let rows = try await client.query("""
            SELECT f.follower_id::text, f.route_label, f.stop_id, fo.walk_min, fo.push_token, f.alert_prefs::text
            FROM follows f JOIN followers fo ON fo.id = f.follower_id WHERE f.route_label = \(route) AND f.stop_id = \(stop)
            """, logger: log)
        var out: [Follow] = []
        for try await (id, r, s, walk, token, prefs) in rows.decode((String, String, String, Int, String?, String).self) {
            let json = (try? JSONSerialization.jsonObject(with: Data(prefs.utf8))) as? [String: Any] ?? [:]
            out.append(Follow(followerId: id, routeLabel: r, stopId: s, walkMin: walk, pushToken: token, alertPrefs: json.mapValues { "\($0)" }))
        }
        return out
    }

    func routesWithReports() async throws -> [String] {
        var out: [String] = []
        for try await r in try await client.query("SELECT DISTINCT route_label FROM reports WHERE t > now() - interval '8 weeks'", logger: log).decode(String.self) { out.append(r) }
        return out
    }
    func reports(route: String) async throws -> [Report] {
        var out: [Report] = []
        for try await (kind, t) in try await client.query("SELECT kind, extract(epoch from t)::float8 FROM reports WHERE route_label = \(route) AND t > now() - interval '8 weeks'", logger: log).decode((String, Double).self) {
            out.append(Report(kind: Report.Kind(rawValue: kind) ?? .noShow, t: Date(timeIntervalSince1970: t)))
        }
        return out
    }
    func hasSummary(route: String, weekStart: String) async throws -> Bool {
        for try await _ in try await client.query("SELECT 1 FROM weekly_summaries WHERE route_label = \(route) AND week_start = \(weekStart)::date", logger: log).decode(Int.self) { return true }
        return false
    }
    func saveSummary(route: String, weekStart: String, text: String) async throws {
        try await client.exec("""
            INSERT INTO weekly_summaries(route_label, week_start, summary) VALUES (\(route), \(weekStart)::date, \(text))
            ON CONFLICT (route_label, week_start) DO UPDATE SET summary = excluded.summary, created_at = now()
            """, log)
    }
}
