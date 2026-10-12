import Testing
import Foundation
import GoNCCore
@testable import GoNCEngine

/// In-memory database for the worker. Holds only anonymous rows.
final class MemoryWorkerStore: WorkerStore, @unchecked Sendable {
    private let lock = NSLock()
    var points: [PointRow] = []
    var routes: [String: RouteInfo] = [:]
    private(set) var tracks: [TrackWrite] = []
    private(set) var statuses: [StatusWrite] = []
    private(set) var published: [[String]] = []
    func recentPoints(since: Double) async throws -> [PointRow] { lock.lock(); defer { lock.unlock() }; return points.filter { $0.t >= since } }
    func route(label: String) async throws -> RouteInfo? { routes[label] }
    func write(track: TrackWrite) async throws { lock.lock(); tracks.append(track); lock.unlock() }
    func upsert(status: StatusWrite) async throws { lock.lock(); statuses.append(status); lock.unlock() }
    func markPublished(tokens: [String], riders: Int) async throws { lock.lock(); published.append(tokens); lock.unlock() }
}

/// Turns simulated projected traces into lat/lon rows near Cary, as the phones would upload them.
private func rows(from traces: [String: Trace], bus: String, epoch: Double) -> [PointRow] {
    let origin = UTM17N.forward(lat: 35.7915, lon: -78.7811)
    return traces.flatMap { token, trace in trace.map { s -> PointRow in
        let ll = UTM17N.inverse(XY(origin.x + s.x, origin.y + s.y))
        return PointRow(token: token, t: epoch + s.t, lat: ll.lat, lon: ll.lon, declaredBus: bus)
    } }
}
private func route() -> RouteInfo {
    let origin = UTM17N.forward(lat: 35.7915, lon: -78.7811)
    let shape = (0...200).map { XY(origin.x + Double($0) * 15, origin.y) }          // 3 km east
    return RouteInfo(shape: shape, stops: [("s1", XY(origin.x + 300, origin.y)), ("s2", XY(origin.x + 1200, origin.y)), ("s3", XY(origin.x + 2400, origin.y))],
                     segmentTimes: [[120, 130, 125], [200, 210, 190], [180, 190, 185]])
}

@Suite("Worker loop, end to end") struct WorkerLoopTests {
    let epoch = 1_800_000_000.0

    @Test func threeRidersPublishOneBusWithStatuses() async throws {
        var rng = SeededRandom(seed: 0)
        let path = Simulator.busPath(duration: 240, rng: &rng)
        let store = MemoryWorkerStore(); store.routes["412"] = route()
        store.points = rows(from: Simulator.ridersOn(path, count: 3, rng: &rng), bus: "412", epoch: epoch)
        let loop = WorkerLoop(store: store)
        try await loop.tick(now: epoch + 240)
        #expect(store.tracks.count == 1 && store.tracks[0].nRiders == 3 && store.tracks[0].routeLabel == "412")
        #expect(store.published.first?.count == 3)
        #expect(!store.statuses.isEmpty && store.statuses.allSatisfy { $0.source == .live && $0.routeLabel == "412" })
    }
    @Test func twoRidersPublishNothing() async throws {            // privacy: k >= 3
        var rng = SeededRandom(seed: 0)
        let path = Simulator.busPath(duration: 240, rng: &rng)
        let store = MemoryWorkerStore(); store.routes["412"] = route()
        store.points = rows(from: Simulator.ridersOn(path, count: 2, rng: &rng), bus: "412", epoch: epoch)
        try await WorkerLoop(store: store).tick(now: epoch + 240)
        #expect(store.tracks.isEmpty && store.published.isEmpty && store.statuses.isEmpty)
    }
    @Test func publishedPositionsAreRoundedToFiftyMeters() async throws {
        var rng = SeededRandom(seed: 1)
        let path = Simulator.busPath(duration: 240, rng: &rng)
        let store = MemoryWorkerStore()
        store.points = rows(from: Simulator.ridersOn(path, count: 4, rng: &rng), bus: "9", epoch: epoch)
        try await WorkerLoop(store: store).tick(now: epoch + 240)
        let t = try #require(store.tracks.first)
        let p = UTM17N.forward(lat: t.lat, lon: t.lon)
        #expect(abs(p.x / 50 - (p.x / 50).rounded()) < 1e-3 && abs(p.y / 50 - (p.y / 50).rounded()) < 1e-3)
    }
    @Test func theSameBusKeepsOneTrackAcrossTicks() async throws {
        var rng = SeededRandom(seed: 2)
        let path = Simulator.busPath(duration: 300, rng: &rng)
        let store = MemoryWorkerStore()
        store.points = rows(from: Simulator.ridersOn(path, count: 4, rng: &rng), bus: "412", epoch: epoch)
        let loop = WorkerLoop(store: store)
        try await loop.tick(now: epoch + 240)
        try await loop.tick(now: epoch + 255)
        #expect(await loop.activeTracks.count == 1)
        #expect(Set(store.tracks.map(\.trackId)).count == 1)
    }
    @Test func aBusWithNoRouteStillPublishesTheTrackButNoStatuses() async throws {
        var rng = SeededRandom(seed: 3)
        let path = Simulator.busPath(duration: 240, rng: &rng)
        let store = MemoryWorkerStore()
        store.points = rows(from: Simulator.ridersOn(path, count: 3, rng: &rng), bus: "77", epoch: epoch)
        try await WorkerLoop(store: store).tick(now: epoch + 240)
        #expect(store.tracks.count == 1 && store.statuses.isEmpty)
    }
}

final class FakeSender: PushSender, @unchecked Sendable {
    private let lock = NSLock(); private(set) var sent: [(String, String)] = []
    func send(token: String, title: String, body: String) async throws { lock.lock(); sent.append((token, body)); lock.unlock() }
}

@Suite("Push dispatch and summaries") struct DispatchTests {
    let status = StatusWrite(routeLabel: "412", stopId: "Oak Lane", stopsAway: 1, etaMin: 4, etaLo: 4, etaHi: 6, source: .live)
    func follow(_ id: String = "f1", prefs: [String: String] = [:], token: String? = "tok") -> Follow { Follow(followerId: id, routeLabel: "412", stopId: "Oak Lane", walkMin: 3, pushToken: token, alertPrefs: prefs) }
    // 2026-10-12 12:00 New York is well outside quiet hours
    let noon = Date(timeIntervalSince1970: 1_791_820_800 - 4 * 3600 + 0)

    @Test func leaveNowSendsOnceAndRespectsTheFiveMinuteLimit() async {
        let sender = FakeSender(); let d = PushDispatcher(sender: sender)
        let a = await d.process(status: status, follows: [follow()], now: noon)
        let b = await d.process(status: status, follows: [follow()], now: noon.addingTimeInterval(60))
        #expect(a == 1 && b == 0 && sender.sent.count == 1)
    }
    @Test func switchedOffTokenlessAndOtherStopsAreSkipped() async {
        let sender = FakeSender(); let d = PushDispatcher(sender: sender)
        let off = await d.process(status: status, follows: [follow(prefs: ["leave_now": "false"])], now: noon)
        let none = await d.process(status: status, follows: [follow(token: nil)], now: noon)
        let other = await d.process(status: StatusWrite(routeLabel: "412", stopId: "Elm St", stopsAway: 1, etaMin: 4, etaLo: 4, etaHi: 6, source: .live), follows: [follow()], now: noon)
        #expect(off == 0 && none == 0 && other == 0 && sender.sent.isEmpty)
    }
    @Test func quietHoursHoldTheAlert() async {
        let sender = FakeSender(); let d = PushDispatcher(sender: sender)
        let n = await d.process(status: status, follows: [follow(prefs: ["quiet_start": "00:00", "quiet_end": "23:59"])], now: noon)
        #expect(n == 0)
    }
    @Test func aNewTripCanAlertAgain() async {
        let sender = FakeSender(); let d = PushDispatcher(sender: sender)
        _ = await d.process(status: status, follows: [follow()], now: noon)
        await d.resetTrip(routeLabel: "412")
        let again = await d.process(status: status, follows: [follow()], now: noon.addingTimeInterval(600))
        #expect(again == 1)
    }
    @Test func theSummaryPromptHoldsOnlyCounts() {
        let i = Insights(weeks: 4, totalNoShow: 5, totalEarly: 1, thisWeek: 2, lastWeek: 1, trend: .up, worstDay: "Tuesday", series: [0, 2, 1, 2])
        let text = SummaryPrompt.text(i)
        #expect(text.contains("didnt_come_total=5") && text.contains("most_reports_on=Tuesday"))
        #expect(!text.contains("student") && !text.lowercased().contains("lat"))
    }
}
