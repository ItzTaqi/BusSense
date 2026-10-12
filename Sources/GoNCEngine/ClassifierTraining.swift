import Foundation
import GoNCCore

/// Trains the bus-vs-car logistic regression. Features are standardized, class weights are balanced, and the fit is
/// L2-regularised (C = 1) with Newton's method, so it needs no outside library. Split by TRIP, never by window.
public enum ClassifierTraining {
    public struct Row: Sendable { public var tripId: String; public var isBus: Bool; public var features: [Double]
        public init(tripId: String, isBus: Bool, features: [Double]) { self.tripId = tripId; self.isBus = isBus; self.features = features } }

    public struct Result: Sendable {
        public var model: LogisticModel
        public var precision: Double, recall: Double, f1: Double
        public var confusion: (tn: Int, fp: Int, fn: Int, tp: Int)
        public var testWindows: Int
    }

    private static func solve(_ a: [[Double]], _ b: [Double]) -> [Double] {      // Gaussian elimination with partial pivoting
        var m = a.enumerated().map { $0.element + [b[$0.offset]] }
        let n = b.count
        for c in 0..<n {
            let p = (c..<n).max { abs(m[$0][c]) < abs(m[$1][c]) }!
            m.swapAt(c, p)
            for r in (c + 1)..<max(n, c + 1) { let f = m[r][c] / m[c][c]; for k in c...n { m[r][k] -= f * m[c][k] } }
        }
        var x = [Double](repeating: 0, count: n)
        for r in stride(from: n - 1, through: 0, by: -1) { x[r] = (m[r][n] - ((r + 1)..<max(n, r + 1)).reduce(0) { $0 + m[r][$1] * x[$1] }) / m[r][r] }
        return x
    }
    static func sigmoid(_ z: Double) -> Double { 1 / (1 + exp(-z)) }

    /// Splits trips (not windows) into train and test, trains, and scores on the held-out trips.
    public static func trainAndEvaluate(_ rows: [Row], testFraction: Double = 0.3, seed: UInt64 = 0, synthetic: Bool = false) -> Result {
        var rng = SeededRandom(seed: seed)
        var trips = Array(Set(rows.map(\.tripId))).sorted()
        trips.shuffle(using: &rng)
        let testTrips = Set(trips.prefix(max(1, Int(Double(trips.count) * testFraction))))
        let train = rows.filter { !testTrips.contains($0.tripId) }, test = rows.filter { testTrips.contains($0.tripId) }

        let d = train[0].features.count
        let mean = (0..<d).map { j in train.map { $0.features[j] }.reduce(0, +) / Double(train.count) }
        let scale = (0..<d).map { j -> Double in
            let v = train.map { pow($0.features[j] - mean[j], 2) }.reduce(0, +) / Double(train.count)
            return v.squareRoot() > 1e-12 ? v.squareRoot() : 1
        }
        let xs = train.map { r in (0..<d).map { (r.features[$0] - mean[$0]) / scale[$0] } + [1.0] }   // last column = bias
        let ys = train.map { $0.isBus ? 1.0 : 0.0 }
        let nBus = ys.reduce(0, +), nOther = Double(ys.count) - nBus
        let weights = ys.map { $0 == 1 ? Double(ys.count) / (2 * max(nBus, 1)) : Double(ys.count) / (2 * max(nOther, 1)) }   // class_weight="balanced"

        var w = [Double](repeating: 0, count: d + 1)
        for _ in 0..<30 {
            var grad = (0..<(d + 1)).map { $0 < d ? w[$0] : 0 }
            var hess = (0..<(d + 1)).map { i in (0..<(d + 1)).map { j in (i == j && i < d) ? 1.0 : 0.0 } }
            for (x, (y, sw)) in zip(xs, zip(ys, weights)) {
                let p = sigmoid(zip(w, x).reduce(0) { $0 + $1.0 * $1.1 })
                for i in 0...d { grad[i] += sw * (p - y) * x[i]; for j in 0...d { hess[i][j] += sw * p * (1 - p) * x[i] * x[j] } }
            }
            let step = solve(hess, grad)
            for i in 0...d { w[i] -= step[i] }
            if step.map(abs).max()! < 1e-10 { break }
        }
        let model = LogisticModel(features: WindowFeatures.names, mean: mean, scale: scale, weights: Array(w[0..<d]), bias: w[d], syntheticPlaceholder: synthetic)
        var tp = 0, fp = 0, fn = 0, tn = 0
        for r in test {
            let pred = model.probability(r.features) >= LogisticModel.uploadThreshold
            switch (pred, r.isBus) { case (true, true): tp += 1; case (true, false): fp += 1; case (false, true): fn += 1; case (false, false): tn += 1 }
        }
        let prec = tp + fp > 0 ? Double(tp) / Double(tp + fp) : 0, rec = tp + fn > 0 ? Double(tp) / Double(tp + fn) : 0
        return Result(model: model, precision: prec, recall: rec, f1: prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0, confusion: (tn, fp, fn, tp), testWindows: test.count)
    }
}

/// SYNTHETIC labeled windows so the pipeline runs before real recordings exist. Accuracy on this data says NOTHING about real rides.
public enum SyntheticWindows {
    private static func window(_ path: Trace, offset: Int, rng: inout SeededRandom, azSD: Double) -> [[Double]] {
        let ts = path.map(\.t), xs = path.map(\.x), ys = path.map(\.y)
        let times = stride(from: path[0].t + Double(offset), to: path[path.count - 1].t - 1, by: 5).prefix(36).map { $0 }
        let x = times.map { Stats.interp($0, ts, xs) }, y = times.map { Stats.interp($0, ts, ys) }
        func grad(_ a: [Double], _ i: Int) -> Double { a.count < 2 ? 0 : (i == 0 ? a[1] - a[0] : i == a.count - 1 ? a[i] - a[i - 1] : (a[i + 1] - a[i - 1]) / 2) / 5 }
        return times.indices.map { i in
            let v = (grad(x, i) * grad(x, i) + grad(y, i) * grad(y, i)).squareRoot() + abs(rng.normal(0, 0.25))
            let hdg = atan2(grad(y, i), grad(x, i)) * 180 / .pi + (v < 2 ? rng.normal(0, 25) : 0)
            return [v, hdg, rng.normal(0, azSD)]
        }
    }
    private static func car(rng: inout SeededRandom) -> Trace {
        var v = [Double](repeating: rng.uniform(8, 16), count: 260)
        for _ in 0..<rng.int(0...2) { let s = rng.int(20...219), len = rng.int(8...39); for k in s..<min(s + len, 260) { v[k] = 0 } }
        var x = 0.0
        return (0..<260).map { x += v[$0]; return Sample(t: Double($0), x: x, y: 0) }
    }
    public static func rows(trips: Int = 60, seed: UInt64 = 0) -> [ClassifierTraining.Row] {
        var rng = SeededRandom(seed: seed)
        var out: [ClassifierTraining.Row] = []
        for k in 0..<trips {
            let label = ["bus", "car", "walk"][k % 3]
            let path: Trace, az: Double
            switch label {
            case "bus": path = Simulator.busPath(duration: 260, rng: &rng, cruise: rng.uniform(7, 12)); az = 0.9
            case "car": path = car(rng: &rng); az = 0.5
            default: path = Simulator.smoothPath(duration: 260, speed: rng.uniform(1.1, 1.7)); az = 1.3
            }
            for s in stride(from: 0, to: 80, by: 8) {
                let w = window(Array(path[s...]), offset: 0, rng: &rng, azSD: az)
                guard w.count >= 12 else { continue }
                out.append(.init(tripId: "\(label)-\(k)", isBus: label == "bus", features: WindowFeatures.compute(w)))
            }
        }
        return out
    }
}
