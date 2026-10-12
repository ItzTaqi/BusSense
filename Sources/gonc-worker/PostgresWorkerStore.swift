import Foundation
import Logging
import PostgresNIO
import GoNCCore
import GoNCEngine

/// The clustering worker's database access. Connect with the `goyellow_worker` role: it can read anonymous location data
/// and write tracks and statuses, and it cannot read riders, followers or follows.
struct PostgresWorkerStore: WorkerStore {
    let client: PostgresClient
    let log: Logger

    func recentPoints(since: Double) async throws -> [PointRow] {
        let rows = try await client.query("""
            SELECT trip_token::text, extract(epoch from t)::float8, st_y(geom::geometry)::float8, st_x(geom::geometry)::float8, coalesce(declared_bus, '')
            FROM trip_points WHERE t > to_timestamp(\(since)::float8) ORDER BY t
            """, logger: log)
        var out: [PointRow] = []
        for try await (token, t, lat, lon, bus) in rows.decode((String, Double, Double, Double, String).self) { out.append(PointRow(token: token, t: t, lat: lat, lon: lon, declaredBus: bus)) }
        return out
    }

    func route(label: String) async throws -> RouteInfo? {
        var wkt: String?
        for try await (s) in try await client.query("SELECT st_astext(shape::geometry) FROM routes WHERE route_label = \(label)", logger: log).decode(String?.self) { wkt = s }
        guard let wkt, let open = wkt.firstIndex(of: "("), let close = wkt.lastIndex(of: ")") else { return nil }
        let shape: [XY] = wkt[wkt.index(after: open)..<close].split(separator: ",").compactMap { pair in
            let p = pair.split(separator: " ").compactMap { Double($0) }
            return p.count == 2 ? UTM17N.forward(lat: p[1], lon: p[0]) : nil
        }
        var stops: [(id: String, xy: XY)] = []
        for try await (id, lon, lat) in try await client.query("SELECT stop_id, st_x(geom::geometry)::float8, st_y(geom::geometry)::float8 FROM stops WHERE route_label = \(label) ORDER BY seq", logger: log).decode((String, Double, Double).self) {
            stops.append((id, UTM17N.forward(lat: lat, lon: lon)))
        }
        var segs: [[Double]] = []
        for try await (_, secs) in try await client.query("SELECT from_seq, array_agg(seconds::float8) FROM segment_times WHERE route_label = \(label) GROUP BY from_seq ORDER BY from_seq", logger: log).decode((Int, [Double]).self) { segs.append(secs) }
        return shape.count >= 2 ? RouteInfo(shape: shape, stops: stops, segmentTimes: segs) : nil
    }

    func write(track t: TrackWrite) async throws {
        try await client.exec("""
            INSERT INTO bus_tracks(track_id, route_label, t, centroid_geom, n_riders, source, is_substitute_guess)
            VALUES (\(t.trackId)::uuid, \(t.routeLabel), to_timestamp(\(t.t)::float8), st_setsrid(st_makepoint(\(t.lon), \(t.lat)), 4326)::geography, \(t.nRiders), 'live', \(t.isSubstituteGuess))
            """, log)
    }

    func upsert(status s: StatusWrite) async throws {
        try await client.exec("""
            INSERT INTO bus_status(route_label, stop_id, stops_away, eta_min, eta_lo, eta_hi, source, updated_at)
            VALUES (\(s.routeLabel), \(s.stopId), \(s.stopsAway), \(s.etaMin), \(s.etaLo), \(s.etaHi), \(s.source.rawValue), now())
            ON CONFLICT (route_label, stop_id) DO UPDATE SET stops_away = excluded.stops_away, eta_min = excluded.eta_min, eta_lo = excluded.eta_lo,
                eta_hi = excluded.eta_hi, source = excluded.source, updated_at = now()
            """, log)
    }

    /// Records what has been published for trips still in progress (the receipt is finalised when the rider ends the trip).
    func markPublished(tokens: [String], riders: Int) async throws {
        for token in tokens {
            try await client.exec("""
                INSERT INTO trip_progress(trip_token, published, max_riders) VALUES (\(token)::uuid, true, \(riders))
                ON CONFLICT (trip_token) DO UPDATE SET published = true, max_riders = greatest(trip_progress.max_riders, excluded.max_riders), updated_at = now()
                """, log)
        }
    }
}
