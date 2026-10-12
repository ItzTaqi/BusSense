import Foundation

/// Track continuity.
///
/// THE IDEA: a bus candidate appears every 15 s. We need to know "is this the same bus as before?" so the bus on the
/// parent's screen glides instead of jumping or duplicating.
///
/// THE MATH:
///  * State per track: [x, y, vx, vy]. Constant-velocity Kalman filter:
///      predict:  x' = F x,  P' = F P F^T + Q      (F adds vx*dt to x, vy*dt to y)
///      update:   K = P H^T (H P H^T + R)^-1;  x = x' + K (z - H x');  P = (I - K H) P'
///    Measurement noise  sigma = 15 m / sqrt(n_riders)  (more phones -> trust the average more).
///  * Association: cost[i][j] = distance(predicted track i, candidate j); gate at 150 m (above it = unmatched).
///    The Hungarian algorithm picks the best one-to-one matching.
///  * Lifecycle: LIVE if a candidate matched within 60 s; RECENT for the next 1-5 min; then dropped.
public struct Track: Equatable, Sendable {
    public enum Status: String, Sendable { case live = "LIVE", recent = "RECENT", dropped = "DROPPED" }
    public var id: String
    public var state: [Double]        // x, y, vx, vy
    public var cov: [[Double]]        // 4x4
    public var lastSeenT: Double
    public var nRiders: Int
    public static let accelNoise = 1.0   // m/s^2: how much a bus's speed may wander between updates

    public init(id: String, state: [Double], cov: [[Double]], lastSeenT: Double, nRiders: Int) {
        self.id = id; self.state = state; self.cov = cov; self.lastSeenT = lastSeenT; self.nRiders = nRiders
    }
    public var position: XY { XY(state[0], state[1]) }

    public static func measurementSigma(nRiders: Int) -> Double { 15.0 / Double(max(nRiders, 1)).squareRoot() }

    public mutating func predict(dt: Double) {
        var f = Matrix.identity(4); f[0][2] = dt; f[1][3] = dt
        let q2 = Self.accelNoise * Self.accelNoise
        let q: [[Double]] = [[pow(dt, 4) / 4, 0, pow(dt, 3) / 2, 0], [0, pow(dt, 4) / 4, 0, pow(dt, 3) / 2],
                             [pow(dt, 3) / 2, 0, dt * dt, 0], [0, pow(dt, 3) / 2, 0, dt * dt]].map { $0.map { $0 * q2 } }
        state = Matrix.mul(f, state)
        cov = Matrix.add(Matrix.mul(Matrix.mul(f, cov), Matrix.transpose(f)), q)
    }

    public mutating func update(_ z: XY, nRiders: Int, t: Double) {
        let r = pow(Self.measurementSigma(nRiders: nRiders), 2)
        // S = H P H^T + R is the 2x2 top-left block of P plus R on the diagonal.
        let s00 = cov[0][0] + r, s01 = cov[0][1], s10 = cov[1][0], s11 = cov[1][1] + r
        let det = s00 * s11 - s01 * s10
        let inv = [[s11 / det, -s01 / det], [-s10 / det, s00 / det]]
        // K = P H^T S^-1: P's first two columns (4x2) times S^-1
        var k = [[Double]](repeating: [0, 0], count: 4)
        for i in 0..<4 { for j in 0..<2 { k[i][j] = cov[i][0] * inv[0][j] + cov[i][1] * inv[1][j] } }
        let innov = [z.x - state[0], z.y - state[1]]
        for i in 0..<4 { state[i] += k[i][0] * innov[0] + k[i][1] * innov[1] }
        // P = (I - K H) P
        var newCov = cov
        for i in 0..<4 { for j in 0..<4 { newCov[i][j] = cov[i][j] - k[i][0] * cov[0][j] - k[i][1] * cov[1][j] } }
        cov = newCov
        lastSeenT = t; self.nRiders = nRiders
    }

    public func status(now: Double) -> Status {
        let age = now - lastSeenT
        if age <= EngineConfig.liveS { return .live }
        return age <= EngineConfig.dropS ? .recent : .dropped
    }

    /// (track index, candidate index) pairs using the Hungarian algorithm and the 150 m gate.
    /// Tracks must already be predicted to the candidates' time.
    public static func associate(_ tracks: [Track], _ candidates: [XY]) -> [(Int, Int)] {
        if tracks.isEmpty || candidates.isEmpty { return [] }
        let gate = EngineConfig.gateM
        let dist = tracks.map { t in candidates.map { t.position.distance(to: $0) } }
        let cost = dist.map { $0.map { $0 <= gate ? $0 : 1e9 } }
        return Hungarian.assign(cost).filter { dist[$0.0][$0.1] <= gate }
    }
}

enum Matrix {
    static func identity(_ n: Int) -> [[Double]] { (0..<n).map { i in (0..<n).map { $0 == i ? 1 : 0 } } }
    static func mul(_ a: [[Double]], _ b: [[Double]]) -> [[Double]] {
        (0..<a.count).map { i in (0..<b[0].count).map { j in (0..<b.count).reduce(0) { $0 + a[i][$1] * b[$1][j] } } }
    }
    static func mul(_ a: [[Double]], _ v: [Double]) -> [Double] { a.map { row in zip(row, v).reduce(0) { $0 + $1.0 * $1.1 } } }
    static func transpose(_ a: [[Double]]) -> [[Double]] { (0..<a[0].count).map { j in a.map { $0[j] } } }
    static func add(_ a: [[Double]], _ b: [[Double]]) -> [[Double]] { zip(a, b).map { zip($0, $1).map(+) } }
}

/// Minimum-cost one-to-one assignment (Hungarian algorithm with potentials, O(n^2 m)). Works for rectangular matrices.
public enum Hungarian {
    public static func assign(_ cost: [[Double]]) -> [(Int, Int)] {
        let rows = cost.count, cols = cost.first?.count ?? 0
        if rows == 0 || cols == 0 { return [] }
        let transposed = rows > cols
        let c: [[Double]] = transposed ? (0..<cols).map { j in cost.map { $0[j] } } : cost
        let n = c.count, m = c[0].count            // n <= m
        var u = [Double](repeating: 0, count: n + 1), v = [Double](repeating: 0, count: m + 1)
        var p = [Int](repeating: 0, count: m + 1), way = [Int](repeating: 0, count: m + 1)
        for i in 1...n {
            p[0] = i
            var j0 = 0
            var minv = [Double](repeating: .infinity, count: m + 1)
            var used = [Bool](repeating: false, count: m + 1)
            repeat {
                used[j0] = true
                let i0 = p[j0]
                var delta = Double.infinity, j1 = 0
                for j in 1...m where !used[j] {
                    let cur = c[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j] { minv[j] = cur; way[j] = j0 }
                    if minv[j] < delta { delta = minv[j]; j1 = j }
                }
                for j in 0...m { if used[j] { u[p[j]] += delta; v[j] -= delta } else { minv[j] -= delta } }
                j0 = j1
            } while p[j0] != 0
            repeat { let j1 = way[j0]; p[j0] = p[j1]; j0 = j1 } while j0 != 0
        }
        var out: [(Int, Int)] = []
        for j in 1...m where p[j] != 0 { out.append(transposed ? (j - 1, p[j] - 1) : (p[j] - 1, j - 1)) }
        return out.sorted { $0.0 < $1.0 }
    }
}
