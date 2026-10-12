import Foundation

/// Deterministic random numbers (SplitMix64) so every simulated run can be reproduced from its seed.
public struct SeededRandom: RandomNumberGenerator, Sendable {
    private var state: UInt64
    public init(seed: UInt64) { state = seed &+ 0x9E3779B97F4A7C15 }
    public mutating func next() -> UInt64 {
        state = state &+ 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
    public mutating func uniform(_ lo: Double, _ hi: Double) -> Double { lo + (hi - lo) * Double(next() >> 11) / Double(1 << 53) }
    public mutating func int(_ range: ClosedRange<Int>) -> Int { Int.random(in: range, using: &self) }
    public mutating func normal(_ mean: Double = 0, _ sd: Double = 1) -> Double {
        let u1 = max(uniform(0, 1), 1e-12), u2 = uniform(0, 1)
        return mean + sd * (-2 * log(u1)).squareRoot() * cos(2 * .pi * u2)
    }
}

/// Trip simulator. Traces are projected metres: [t_seconds, x_m, y_m].
///   Bus: stop-and-go along the x axis (stops every ~300 m, 15-30 s dwell).
///   Riders: a copy of the bus trace + independent Gaussian noise + random 5-20 s dropouts, sampled every ~5 s.
///   Car/walker: same road, but no bus-style stops.
public enum Simulator {
    /// 1 Hz ground-truth bus path with acceleration limits and dwell at stops.
    public static func busPath(duration: Int, rng: inout SeededRandom, startX: Double = 0, stopEveryM: Double = 300, cruise: Double = 9) -> Trace {
        var t = 0, x = startX, v = 0.0
        var nextStop = startX + stopEveryM
        var dwell = 0
        var out: Trace = []
        while t < duration {
            if dwell > 0 { dwell -= 1; v = 0 }
            else {
                let brake = v * v / (2 * 1.2)
                if nextStop - x <= brake + 1 {
                    v = max(0, v - 1.2)
                    if v == 0 || nextStop - x < 1 { dwell = rng.int(15...30); nextStop += stopEveryM; v = 0 }
                } else { v = min(cruise, v + 1.0) }
            }
            x += v
            out.append(Sample(t: Double(t), x: x, y: 0))
            t += 1
        }
        return out
    }

    /// Car (or walker with speed 1.4): constant speed, no stops.
    public static func smoothPath(duration: Int, speed: Double = 9, startX: Double = 0) -> Trace {
        (0..<duration).map { Sample(t: Double($0), x: startX + speed * Double($0), y: 0) }
    }

    /// Noisy 5 s samples from a ground-truth path, with random 5-20 s dropouts.
    public static func sampleRider(_ path: Trace, rng: inout SeededRandom, sigma: Double = 8, dropout: Bool = true, tOffset: Double = 0) -> Trace {
        let ts = path.map(\.t), xs = path.map(\.x), ys = path.map(\.y)
        var times: [Double] = []
        var t = path[0].t + rng.uniform(0, 5)
        while t < path[path.count - 1].t { times.append(t); t += 5 }
        var out: Trace = []
        var keep = [Bool](repeating: true, count: times.count)
        if dropout {
            var i = 0
            while i < times.count {
                if rng.uniform(0, 1) < 0.03 { let n = rng.int(1...4); for k in i..<min(i + n, times.count) { keep[k] = false }; i += n }
                i += 1
            }
        }
        for (i, tt) in times.enumerated() {
            let x = Stats.interp(tt, ts, xs) + rng.normal(0, sigma), y = Stats.interp(tt, ts, ys) + rng.normal(0, sigma)
            if keep[i] { out.append(Sample(t: tt + tOffset, x: x, y: y)) }
        }
        return out
    }

    public static func ridersOn(_ path: Trace, count: Int, rng: inout SeededRandom, sigma: Double = 8, prefix: String = "") -> [String: Trace] {
        var out: [String: Trace] = [:]
        for _ in 0..<count {
            let token = prefix + String(rng.next(), radix: 16) + String(rng.next(), radix: 16)
            out[token] = sampleRider(path, rng: &rng, sigma: sigma)
        }
        return out
    }
}

/// Adversarial scenarios from the brief. Each returns the points and the expected number of buses.
public enum Scenarios {
    public static let window = 180
    public typealias Result = (points: [String: Trace], expectedBuses: Int)

    public static func threeSiblingsInCar(rng: inout SeededRandom) -> Result {
        (Simulator.ridersOn(Simulator.smoothPath(duration: window), count: 3, rng: &rng), 0)
    }
    /// The bus is real; the tailing car (25 m behind, no matching stops) must NOT join it.
    public static func carTailingBus(rng: inout SeededRandom) -> Result {
        let bus = Simulator.busPath(duration: window, rng: &rng)
        var pts = Simulator.ridersOn(bus, count: 3, rng: &rng)
        let meanSpeed = (bus.last!.x - bus.first!.x) / Double(bus.count - 1)
        var tail = Simulator.smoothPath(duration: window, speed: meanSpeed)
        tail = tail.map { Sample(t: $0.t, x: $0.x - 25, y: $0.y) }
        pts["car0"] = Simulator.sampleRider(tail, rng: &rng)
        return (pts, 1)
    }
    public static func twoBusesOverlapping(rng: inout SeededRandom) -> Result {
        let a = Simulator.busPath(duration: window + 60, rng: &rng)
        let b = a.map { Sample(t: $0.t + 60, x: $0.x, y: $0.y) }.filter { $0.t < Double(window + 60) }
        var pts: [String: Trace] = [:]
        for (k, v) in Simulator.ridersOn(a, count: 3, rng: &rng, prefix: "a") { pts[k] = v }
        for (k, v) in Simulator.ridersOn(b, count: 3, rng: &rng, prefix: "b") { pts[k] = v }
        return (pts, 2)
    }
    public static func walkersAfterExit(rng: inout SeededRandom) -> Result {
        (Simulator.ridersOn(Simulator.smoothPath(duration: window, speed: 1.4), count: 3, rng: &rng, sigma: 5), 0)
    }
    /// Only 2 riders on a bus: ESTIMATE at most, never LIVE (so 0 published buses).
    public static func onlyTwoRiders(rng: inout SeededRandom) -> Result {
        (Simulator.ridersOn(Simulator.busPath(duration: window, rng: &rng), count: 2, rng: &rng), 0)
    }

    public static let all: [(name: String, run: (inout SeededRandom) -> Result)] = [
        ("siblings_in_car", threeSiblingsInCar), ("car_tailing_bus", carTailingBus), ("two_buses", twoBusesOverlapping),
        ("walkers", walkersAfterExit), ("two_riders", onlyTwoRiders),
    ]
}
