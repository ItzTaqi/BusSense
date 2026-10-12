import Foundation

/// Pure pipeline helpers used by the worker (testable without a database).
/// Label = majority vote of members' declared bus numbers; position along the route; stops-away; public coarsening
/// (round to 50 m); discrete Frechet distance for route matching / substitute detection (< 150 m = same route).
public enum Pipeline {
    public static func majorityLabel(_ labels: [String]) -> String? {
        var counts: [String: Int] = [:]
        for l in labels where !l.isEmpty { counts[l, default: 0] += 1 }
        return counts.max { $0.value != $1.value ? $0.value < $1.value : $0.key > $1.key }?.key
    }

    public static func roundPublic(_ p: XY) -> XY {
        let g = EngineConfig.publicGridM
        return XY((p.x / g).rounded() * g, (p.y / g).rounded() * g)
    }

    /// Distance (m) along the shape of the point on the shape nearest to `p`.
    public static func alongRoute(_ shape: [XY], _ p: XY) -> Double {
        var arc = [0.0]
        for i in 1..<shape.count { arc.append(arc[i - 1] + shape[i].distance(to: shape[i - 1])) }
        return arc[shape.indices.min { shape[$0].distance(to: p) < shape[$1].distance(to: p) }!]
    }

    /// Number of stops the bus will make before the family's stop (0 = "your stop is next"); nil once the bus is >= 100 m past it.
    public static func stopsAway(shape: [XY], stops: [XY], bus: XY, mySeq: Int) -> Int? {
        let busS = alongRoute(shape, bus)
        let stopS = stops.map { alongRoute(shape, $0) }
        if busS > stopS[mySeq - 1] + 100 { return nil }
        return (0..<(mySeq - 1)).filter { stopS[$0] >= busS - 1 }.count
    }

    /// Discrete Frechet distance between two polylines.
    public static func frechet(_ p: [XY], _ q: [XY]) -> Double {
        let n = p.count, m = q.count
        var ca = [[Double]](repeating: [Double](repeating: .infinity, count: m), count: n)
        for i in 0..<n { for j in 0..<m {
            let d = p[i].distance(to: q[j])
            if i == 0 && j == 0 { ca[i][j] = d }
            else if i == 0 { ca[i][j] = max(ca[i][j - 1], d) }
            else if j == 0 { ca[i][j] = max(ca[i - 1][j], d) }
            else { ca[i][j] = max(min(ca[i - 1][j], ca[i - 1][j - 1], ca[i][j - 1]), d) }
        } }
        return ca[n - 1][m - 1]
    }
    public static func matchesRoute(_ recent: [XY], _ shape: [XY]) -> Bool { frechet(recent, shape) < EngineConfig.frechetMatchM }

    /// The path matches route L but riders declared a different bus number -> likely a substitute.
    public static func isSubstituteGuess(votedLabel: String?, routeLabel: String?) -> Bool {
        guard let v = votedLabel, let r = routeLabel else { return false }
        return v != r
    }
}
