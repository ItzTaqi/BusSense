import Testing
import Foundation
import GoNCCore
@testable import GoNCEngine

private func xy(_ x: Double, _ y: Double = 0) -> XY { XY(x, y) }

@Suite("Companion detection") struct CompanionTests {
    @Test func kMinIsThree() { #expect(EngineConfig.kMin == 3) }

    @Test func threeRidersMakeOneBus() {
        var rng = SeededRandom(seed: 0)
        let bus = Simulator.busPath(duration: 180, rng: &rng)
        var r1 = SeededRandom(seed: 1)
        let groups = Companions.detectBuses(Simulator.ridersOn(bus, count: 3, rng: &r1))
        #expect(groups.count == 1 && groups[0].count == 3)
    }
    @Test func twoRidersNeverMakeABus() {      // privacy rule: k >= 3
        var rng = SeededRandom(seed: 0)
        let bus = Simulator.busPath(duration: 180, rng: &rng)
        for seed in 0..<10 {
            var r = SeededRandom(seed: UInt64(seed))
            #expect(Companions.detectBuses(Simulator.ridersOn(bus, count: 2, rng: &r)).isEmpty)
        }
    }
    @Test func fiveRidersOneBus() {
        var rng = SeededRandom(seed: 0)
        let bus = Simulator.busPath(duration: 180, rng: &rng)
        var r = SeededRandom(seed: 2)
        #expect(Companions.detectBuses(Simulator.ridersOn(bus, count: 5, rng: &r)).map(\.count) == [5])
    }
    @Test func adversarialScenariosPublishNothing() {
        for (name, run) in Scenarios.all where ["siblings_in_car", "walkers", "two_riders"].contains(name) {
            for seed in 0..<10 {
                var rng = SeededRandom(seed: UInt64(seed))
                let s = run(&rng)
                #expect(Companions.detectBuses(s.points).count == s.expectedBuses, "\(name) seed \(seed)")
            }
        }
    }
    @Test func twoOverlappingBusesGiveTwo() {
        for seed in 0..<10 {
            var rng = SeededRandom(seed: UInt64(seed))
            let s = Scenarios.twoBusesOverlapping(rng: &rng)
            #expect(Companions.detectBuses(s.points).count == 2, "seed \(seed)")
        }
    }
    @Test func tailingCarDoesNotJoinTheBus() {
        var rng = SeededRandom(seed: 3)
        let s = Scenarios.carTailingBus(rng: &rng)
        let groups = Companions.detectBuses(s.points)
        #expect(groups.count == 1 && !groups[0].contains("car0"))
    }
}

@Suite("Tracker") struct TrackerTests {
    private func mk(_ x: Double, _ y: Double = 0, vx: Double = 0, vy: Double = 0, seen: Double = 0) -> Track {
        Track(id: "t", state: [x, y, vx, vy], cov: Matrix.identity(4).map { $0.map { $0 * 100 } }, lastSeenT: seen, nRiders: 3)
    }
    @Test func sigmaShrinksWithRiders() {
        #expect(abs(Track.measurementSigma(nRiders: 1) - 15) < 1e-9)
        #expect(abs(Track.measurementSigma(nRiders: 4) - 7.5) < 1e-9)
    }
    @Test func predictMovesByVelocity() { var t = mk(0, vx: 10); t.predict(dt: 15); #expect(abs(t.state[0] - 150) < 1e-9) }
    @Test func updatePullsTowardMeasurementAndShrinksCovariance() {
        var t = mk(0)
        let before = (0..<4).reduce(0.0) { $0 + t.cov[$1][$1] }
        t.update(xy(10), nRiders: 4, t: 15)
        #expect(t.state[0] > 0 && t.state[0] <= 10)
        #expect((0..<4).reduce(0.0) { $0 + t.cov[$1][$1] } < before)
    }
    @Test func associationIsOneToOneAndGated() {
        let pairs = Track.associate([mk(0), mk(1000)], [xy(1005), xy(5), xy(5000)])
        #expect(pairs.map { "\($0.0)-\($0.1)" }.sorted() == ["0-1", "1-0"])
        #expect(Track.associate([mk(0)], [xy(151)]).isEmpty)
    }
    @Test func lifecycle() {
        let t = mk(0, seen: 100)
        #expect(t.status(now: 150) == .live)
        #expect(t.status(now: 220) == .recent)
        #expect(t.status(now: 500) == .dropped)
    }
    @Test func hungarianMatchesBruteForce() {
        var rng = SeededRandom(seed: 7)
        for _ in 0..<30 {
            let n = rng.int(1...5), m = rng.int(1...5)
            let cost = (0..<n).map { _ in (0..<m).map { _ in rng.uniform(0, 100) } }
            let got = Hungarian.assign(cost).reduce(0.0) { $0 + cost[$1.0][$1.1] }
            // brute force over assignments of the smaller side
            func best(_ row: Int, _ used: Set<Int>) -> Double {
                if row == n { return 0 }
                var b = Double.infinity
                if m - used.count >= n - row { for j in 0..<m where !used.contains(j) { b = min(b, cost[row][j] + best(row + 1, used.union([j]))) } }
                if n > m && row < n { b = min(b, best(row + 1, used)) }          // a row may stay unmatched when rows > cols
                return b
            }
            let rows = Hungarian.assign(cost).count
            #expect(rows == min(n, m))
            if n <= m { #expect(abs(got - best(0, [])) < 1e-9) }
        }
    }
}

@Suite("Route learning and ETA") struct RouteAndETA {
    @Test func resampleEvenSpacing() {
        let p = RouteLearning.resample([xy(0), xy(100)], n: 11)
        for i in 1..<p.count { #expect(abs((p[i].x - p[i - 1].x) - 10) < 1e-9) }
    }
    @Test func shapeIgnoresOutlierTrip() {
        var rng = SeededRandom(seed: 0)
        let base = (0..<50).map { xy(Double($0) * 1000 / 49) }
        var trips = (0..<5).map { _ in base.map { XY($0.x + rng.normal(0, 3), $0.y + rng.normal(0, 3)) } }
        trips.append(base.map { XY($0.x, $0.y + 200) })
        let shape = RouteLearning.learnShape(trips)
        #expect(abs(Stats.median(shape.map(\.y))) < 10)
    }
    @Test func stopsNeedSixtyPercentOfTrips() {
        var rng = SeededRandom(seed: 1)
        let shape = (0..<100).map { xy(Double($0) * 1000 / 99) }
        func jitter(_ p: XY) -> XY { XY(p.x + rng.normal(0, 5), p.y + rng.normal(0, 5)) }
        var trips = (0..<5).map { _ in [jitter(xy(300)), jitter(xy(700))] }
        trips.append([jitter(xy(300)), jitter(xy(700)), jitter(xy(500))])    // the 500 m pause happened on 1 of 6 trips
        let stops = RouteLearning.learnStops(pausesPerTrip: trips, shape: shape)
        #expect(stops.count == 2 && stops[0].x < stops[1].x)
    }
    @Test func segmentDurations() { #expect(RouteLearning.segmentDurations([0, 60, 180]) == [60, 120]) }

    @Test func deltaNeutralAndClipped() {
        #expect(abs(ETA.delta(elapsedS: 300, completedMediansS: [300]) - 1) < 1e-9)
        #expect(abs(ETA.delta(elapsedS: 1000, completedMediansS: [300]) - 1.8) < 1e-9)
        #expect(abs(ETA.delta(elapsedS: 10, completedMediansS: [300]) - 0.7) < 1e-9)
    }
    @Test func etaSumsMediansTimesDelta() {
        let r = ETA.seconds(segTimes: [[60, 60, 60], [120, 120, 120]], from: 0, to: 2, delta: 1)
        #expect(abs(r.eta - 180) < 1e-9 && r.lo <= r.eta && r.eta <= r.hi)
    }
    @Test func rangeUsesPercentiles() {
        let seg = (1...10).map { Double($0) * 10 }
        let r = ETA.seconds(segTimes: [seg], from: 0, to: 1, delta: 1)
        #expect(abs(r.lo - Stats.percentile(seg, 20)) < 1e-9 && abs(r.hi - Stats.percentile(seg, 80)) < 1e-9)
        #expect(abs(Stats.percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 20) - 28) < 1e-9)   // numpy: 28.0
    }
    @Test func sourceEstimateVsNoData() {
        #expect(ETA.source(nTrips: 5, hasLiveOrRecent: false) == .estimate)
        #expect(ETA.source(nTrips: 4, hasLiveOrRecent: false) == .noData)
    }
}

@Suite("Pipeline and projection") struct PipelineTests {
    let shape = (0...100).map { xy(Double($0) * 10) }
    let stops = [xy(100), xy(400), xy(800)]
    @Test func majorityVote() {
        #expect(Pipeline.majorityLabel(["12", "12", "7", ""]) == "12")
        #expect(Pipeline.majorityLabel([]) == nil)
    }
    @Test func roundTo50m() { let p = Pipeline.roundPublic(xy(74, 26)); #expect(p == XY(50, 50)) }
    @Test func stopsAway() {
        #expect(Pipeline.stopsAway(shape: shape, stops: stops, bus: xy(50), mySeq: 3) == 2)
        #expect(Pipeline.stopsAway(shape: shape, stops: stops, bus: xy(450), mySeq: 3) == 0)
        #expect(Pipeline.stopsAway(shape: shape, stops: stops, bus: xy(950), mySeq: 3) == nil)
        #expect(Pipeline.alongRoute(shape, xy(500, 30)) == 500)
    }
    @Test func frechetAndRouteMatch() {
        let near = shape.map { XY($0.x, $0.y + 40) }, far = shape.map { XY($0.x, $0.y + 400) }
        #expect(Pipeline.frechet(shape, near) < 150 && Pipeline.matchesRoute(near, shape) && !Pipeline.matchesRoute(far, shape))
    }
    @Test func substituteGuess() {
        #expect(Pipeline.isSubstituteGuess(votedLabel: "99", routeLabel: "12") && !Pipeline.isSubstituteGuess(votedLabel: "12", routeLabel: "12"))
    }
    @Test func projectionMatchesPyproj() {
        let cases: [(Double, Double, Double, Double)] = [
            (35.7915, -78.7811, 700525.2420483371, 3963094.675635198),
            (35.7796, -78.6382, 713473.4241602274, 3962076.607093802),
            (35.6513, -78.8336, 696123.5202442878, 3947435.345373605),
            (35.9799, -78.5097, 724523.8411729052, 3984586.747067082),
            (35.5, -78.97, 684119.6424141948, 3930387.998283782),
            (36.08, -78.25, 747629.7695002799, 3996322.9796272074),
        ]
        for (lat, lon, x, y) in cases {
            let p = UTM17N.forward(lat: lat, lon: lon)
            #expect(abs(p.x - x) < 0.01 && abs(p.y - y) < 0.01, "forward \(lat),\(lon)")
            let back = UTM17N.inverse(p)
            #expect(abs(back.lat - lat) < 1e-8 && abs(back.lon - lon) < 1e-8, "inverse \(lat),\(lon)")
        }
    }
}

@Suite("Classifier training") struct TrainingTests {
    @Test func learnsASeparableProblemAndSplitsByTrip() {
        var rng = SeededRandom(seed: 3)
        var rows: [ClassifierTraining.Row] = []
        for t in 0..<40 {
            let bus = t % 2 == 0
            for _ in 0..<5 { rows.append(.init(tripId: "t\(t)", isBus: bus, features: (0..<6).map { _ in rng.normal(bus ? 2 : -2, 0.5) })) }
        }
        let r = ClassifierTraining.trainAndEvaluate(rows)
        #expect(r.f1 > 0.95)
        #expect(r.testWindows % 5 == 0)      // whole trips only: windows from one trip never straddle train and test
        #expect(r.model.weights.count == 6)
    }
    @Test func syntheticWindowsAreMarkedAsSynthetic() {
        let r = ClassifierTraining.trainAndEvaluate(SyntheticWindows.rows(trips: 30), synthetic: true)
        #expect(r.model.syntheticPlaceholder)
    }
}
