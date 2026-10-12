import Foundation

/// Companion detection (worker, every 15 s).
///
/// THE IDEA: a school bus is a group of phones that stay close AND stop and start at the same moments.
/// Cars driving together stay close but do not share a bus's stop-and-go rhythm, so we test both.
///
/// THE MATH:
///  1. For each token take the last `windowS` seconds and linearly interpolate onto a shared `gridS`-second time grid.
///     Drop tokens covering < `minCoverage` of the grid.
///  2. Only compare pairs whose mean positions are within `pairRadiusM` (spatial hash, no all-pairs scan at scale).
///  3. A pair are companions if they are within `closeM` for >= `closeFraction` of the grid AND their stop events
///     (start and end) match within +-`stopMatchS` for >= `stopMatchFraction` of stops. A "stop" = smoothed speed
///     below `stopSpeedMps` for 8-90 s.
///  4. Companion graph -> connected components. Components with >= `kMin` tokens are bus candidates.
public enum Companions {
    typealias C = EngineConfig

    /// Positions on the shared grid, or nil when coverage is below `minCoverage`.
    public static func resampleToGrid(_ trace: Trace, grid: [Double]) -> [XY]? {
        guard trace.count >= 2 else { return nil }
        let ts = trace.map(\.t), xs = trace.map(\.x), ys = trace.map(\.y)
        var covered = 0
        for g in grid {
            var lo = 0, hi = ts.count
            while lo < hi { let mid = (lo + hi) / 2; if ts[mid] < g { lo = mid + 1 } else { hi = mid } }
            let i = min(max(lo, 1), ts.count - 1)
            if min(abs(g - ts[i - 1]), abs(g - ts[i])) <= C.coverageGapS { covered += 1 }
        }
        if Double(covered) / Double(grid.count) < C.minCoverage { return nil }
        return grid.map { XY(Stats.interp($0, ts, xs), Stats.interp($0, ts, ys)) }
    }

    /// 3-point moving average of position (cuts GPS noise), then central-difference speed.
    static func smoothSpeed(_ xy: [XY]) -> [Double] {
        let n = xy.count
        func at(_ i: Int) -> XY { xy[min(max(i, 0), n - 1)] }
        let sm = (0..<n).map { i in XY((at(i - 1).x + at(i).x + at(i + 1).x) / 3, (at(i - 1).y + at(i).y + at(i + 1).y) / 3) }
        var v = [Double](repeating: 0, count: n)
        if n >= 3 {
            for i in 1..<(n - 1) { v[i] = sm[i + 1].distance(to: sm[i - 1]) / (2 * C.gridS) }
            v[0] = v[1]; v[n - 1] = v[n - 2]
        }
        return v
    }

    public struct Stop: Equatable, Sendable { public var start: Double, end: Double }

    /// Stop events: slow for 8-90 s, not touching the window edge (those durations are truncated and unreliable).
    public static func findStops(_ xy: [XY], grid: [Double]) -> [Stop] {
        var slow = smoothSpeed(xy).map { $0 < C.stopSpeedMps }
        if slow.count >= 3 { for i in 1..<(slow.count - 1) where !slow[i] && slow[i - 1] && slow[i + 1] { slow[i] = true } } // bridge one noisy blip
        var stops: [Stop] = []
        var i = 0
        while i < slow.count {
            if !slow[i] { i += 1; continue }
            var j = i
            while j + 1 < slow.count && slow[j + 1] { j += 1 }
            let touchesEdge = i == 0 || j == slow.count - 1
            let dur = grid[j] - grid[i] + C.gridS
            if !touchesEdge && dur >= C.stopMinS && dur <= C.stopMaxS { stops.append(Stop(start: grid[i], end: grid[j])) }
            i = j + 1
        }
        return stops
    }

    static func matchFraction(_ a: [Stop], _ b: [Stop]) -> Double {
        if a.isEmpty { return 0 }
        let hit = a.filter { s in b.contains { abs(s.start - $0.start) <= C.stopMatchS && abs(s.end - $0.end) <= C.stopMatchS } }.count
        return Double(hit) / Double(a.count)
    }

    public static func areCompanions(_ a: [XY], _ b: [XY], grid: [Double]) -> Bool {
        let close = zip(a, b).filter { $0.distance(to: $1) <= C.closeM }.count
        if Double(close) / Double(a.count) < C.closeFraction { return false }
        let sa = findStops(a, grid: grid), sb = findStops(b, grid: grid)
        if sa.count < C.minStopsToMatch || sb.count < C.minStopsToMatch { return false }
        // Measure against the SHORTER list: GPS noise can hide a short stop for one phone, and that missed stop
        // should not veto two phones that agree on every stop both of them saw.
        let (short, long) = sa.count <= sb.count ? (sa, sb) : (sb, sa)
        return matchFraction(short, long) >= C.stopMatchFraction
    }

    /// One set of tokens per bus candidate.
    public static func detectBuses(_ points: [String: Trace]) -> [Set<String>] {
        let usable = points.values.filter { !$0.isEmpty }
        guard usable.count >= C.kMin else { return [] }
        let tEnd = usable.map { $0[$0.count - 1].t }.max()!
        let first = tEnd - C.windowS
        let count = Int((C.windowS / C.gridS + 1e-9).rounded(.down)) + 1
        let grid = (0..<count).map { first + Double($0) * C.gridS }

        var grids: [String: [XY]] = [:]
        for (token, trace) in points {
            let window = trace.filter { $0.t >= first - C.coverageGapS }
            if !window.isEmpty, let g = resampleToGrid(window, grid: grid) { grids[token] = g }
        }
        guard grids.count >= C.kMin else { return [] }

        let tokens = grids.keys.sorted()
        let means: [XY] = tokens.map { t in let g = grids[t]!; return XY(g.map(\.x).reduce(0, +) / Double(g.count), g.map(\.y).reduce(0, +) / Double(g.count)) }
        var parent = Array(0..<tokens.count)
        func find(_ i: Int) -> Int { var r = i; while parent[r] != r { r = parent[r] }; var c = i; while parent[c] != r { let nx = parent[c]; parent[c] = r; c = nx }; return r }

        // Spatial hash: only neighbouring cells can hold pairs within pairRadiusM.
        var cells: [[Int]: [Int]] = [:]
        for (i, m) in means.enumerated() { cells[[Int((m.x / C.pairRadiusM).rounded(.down)), Int((m.y / C.pairRadiusM).rounded(.down))], default: []].append(i) }
        for (i, m) in means.enumerated() {
            let cx = Int((m.x / C.pairRadiusM).rounded(.down)), cy = Int((m.y / C.pairRadiusM).rounded(.down))
            for dx in -1...1 { for dy in -1...1 { for j in cells[[cx + dx, cy + dy]] ?? [] where j > i {
                guard m.distance(to: means[j]) <= C.pairRadiusM else { continue }
                if areCompanions(grids[tokens[i]]!, grids[tokens[j]]!, grid: grid) { parent[find(i)] = find(j) }
            } } }
        }
        var groups: [Int: Set<String>] = [:]
        for i in 0..<tokens.count { groups[find(i), default: []].insert(tokens[i]) }
        return groups.values.filter { $0.count >= C.kMin }.sorted { $0.min()! < $1.min()! }
    }

    /// Bus candidate position = median of the members' latest positions.
    public static func candidatePosition(_ group: Set<String>, _ points: [String: Trace]) -> XY {
        let last = group.compactMap { points[$0]?.last }
        return XY(Stats.median(last.map(\.x)), Stats.median(last.map(\.y)))
    }
}
