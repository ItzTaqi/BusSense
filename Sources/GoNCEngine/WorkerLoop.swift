import Foundation
import GoNCCore

/// What the worker needs from the database. The real one talks to Postgres with a role that CANNOT read account tables;
/// tests use an in-memory one. Rows never carry a user id.
public struct PointRow: Sendable, Equatable {
    public var token: String, t: Double, lat: Double, lon: Double, declaredBus: String
    public init(token: String, t: Double, lat: Double, lon: Double, declaredBus: String) { self.token = token; self.t = t; self.lat = lat; self.lon = lon; self.declaredBus = declaredBus }
}
public struct RouteInfo: Sendable {
    public var shape: [XY]; public var stops: [(id: String, xy: XY)]; public var segmentTimes: [[Double]]
    public init(shape: [XY], stops: [(id: String, xy: XY)], segmentTimes: [[Double]] = []) { self.shape = shape; self.stops = stops; self.segmentTimes = segmentTimes }
}
public struct TrackWrite: Sendable, Equatable {
    public var trackId: String, routeLabel: String?, t: Double, lat: Double, lon: Double, nRiders: Int, isSubstituteGuess: Bool
    public init(trackId: String, routeLabel: String?, t: Double, lat: Double, lon: Double, nRiders: Int, isSubstituteGuess: Bool) {
        self.trackId = trackId; self.routeLabel = routeLabel; self.t = t; self.lat = lat; self.lon = lon; self.nRiders = nRiders; self.isSubstituteGuess = isSubstituteGuess
    }
}
public struct StatusWrite: Sendable, Equatable {
    public var routeLabel: String, stopId: String, stopsAway: Int?, etaMin: Double?, etaLo: Double?, etaHi: Double?, source: BusSource
    public init(routeLabel: String, stopId: String, stopsAway: Int?, etaMin: Double?, etaLo: Double?, etaHi: Double?, source: BusSource) {
        self.routeLabel = routeLabel; self.stopId = stopId; self.stopsAway = stopsAway; self.etaMin = etaMin; self.etaLo = etaLo; self.etaHi = etaHi; self.source = source
    }
}
public protocol WorkerStore: Sendable {
    func recentPoints(since: Double) async throws -> [PointRow]
    func route(label: String) async throws -> RouteInfo?
    func write(track: TrackWrite) async throws
    func upsert(status: StatusWrite) async throws
    func markPublished(tokens: [String], riders: Int) async throws
}

/// The worker tick (every 15 s): points -> companions -> tracks -> bus_tracks / bus_status.
/// Publishing is the ONLY place that matters for privacy, and it re-checks k >= 3 right there.
public actor WorkerLoop {
    public static let intervalS = 15.0
    private let store: WorkerStore
    private var tracks: [Track] = []
    private var labels: [String: String] = [:]     // track id -> voted bus label

    public init(store: WorkerStore) { self.store = store }
    public var activeTracks: [Track] { tracks }

    public func tick(now: Double) async throws {
        let rows = try await store.recentPoints(since: now - 240)
        var traces: [String: Trace] = [:], declared: [String: String] = [:]
        for r in rows.sorted(by: { $0.t < $1.t }) {
            let p = UTM17N.forward(lat: r.lat, lon: r.lon)
            traces[r.token, default: []].append(Sample(t: r.t, x: p.x, y: p.y)); declared[r.token] = r.declaredBus
        }
        let groups = Companions.detectBuses(traces)
        let candidates = groups.map { Companions.candidatePosition($0, traces) }

        for i in tracks.indices { tracks[i].predict(dt: Self.intervalS) }
        var pairs = Track.associate(tracks, candidates)
        let matched = Set(pairs.map { $0.1 })
        for (ti, ci) in pairs { tracks[ti].update(candidates[ci], nRiders: groups[ci].count, t: now) }
        for ci in groups.indices where !matched.contains(ci) {
            let c = candidates[ci]
            tracks.append(Track(id: UUID().uuidString, state: [c.x, c.y, 0, 0], cov: Matrix.identity(4).map { $0.map { $0 * 400 } }, lastSeenT: now, nRiders: groups[ci].count))
            pairs.append((tracks.count - 1, ci))
        }
        for (ti, ci) in pairs {
            let members = groups[ci]
            guard members.count >= EngineConfig.kMin else { continue }          // privacy floor, checked again at the publish boundary
            let label = Pipeline.majorityLabel(members.compactMap { declared[$0] })
            labels[tracks[ti].id] = label
            let pub = UTM17N.inverse(Pipeline.roundPublic(tracks[ti].position))
            try await store.write(track: TrackWrite(trackId: tracks[ti].id, routeLabel: label, t: now, lat: pub.lat, lon: pub.lon, nRiders: members.count, isSubstituteGuess: false))
            try await store.markPublished(tokens: Array(members), riders: members.count)
            if let label { try await publishStatus(track: tracks[ti], label: label, now: now) }
        }
        tracks.removeAll { $0.status(now: now) == .dropped }
    }

    private func publishStatus(track: Track, label: String, now: Double) async throws {
        guard let route = try await store.route(label: label), !route.stops.isEmpty else { return }
        let source: BusSource = track.status(now: now) == .live ? .live : .recent
        let stopsXY = route.stops.map(\.xy)
        for seq in 1...route.stops.count {
            guard let away = Pipeline.stopsAway(shape: route.shape, stops: stopsXY, bus: track.position, mySeq: seq) else { continue }
            var eta: Double?, lo: Double?, hi: Double?
            let segs = route.segmentTimes
            if !segs.isEmpty && seq - 1 <= segs.count {
                let i = max(0, seq - 1 - away)
                let r = ETA.seconds(segTimes: segs, from: min(i, segs.count), to: min(seq - 1, segs.count), delta: 1.0)   // delta stays 1.0 until today's elapsed time is tracked
                eta = r.eta / 60; lo = r.lo / 60; hi = r.hi / 60
            }
            try await store.upsert(status: StatusWrite(routeLabel: label, stopId: route.stops[seq - 1].id, stopsAway: away, etaMin: eta, etaLo: lo, etaHi: hi, source: source))
        }
    }
}
