import Foundation
import GoNCCore

/// Route learning.
///
/// THE IDEA: after >= 5 published trips with the same bus label, average them into a route line and find where the bus
/// usually stops, so we can say "2 stops away" without anyone typing the route.
///
/// THE MATH:
///  * Shape: resample each trip to N equally spaced points along its length, then take the per-index median x, y
///    (the median ignores a trip that took a detour).
///  * Stops: collect every pause location from all trips; run DBSCAN (eps = 30 m) so a cluster is a place where trips
///    paused. A cluster counts only if >= 60% of trips paused there (distinct TRIPS, not raw points). Order by distance along the shape.
public enum RouteLearning {
    public static func resample(_ path: [XY], n: Int = 200) -> [XY] {
        guard path.count >= 2 else { return path }
        var arc = [0.0]
        for i in 1..<path.count { arc.append(arc[i - 1] + path[i].distance(to: path[i - 1])) }
        guard let total = arc.last, total > 0 else { return Array(repeating: path[0], count: n) }
        let xs = path.map(\.x), ys = path.map(\.y)
        return (0..<n).map { k in
            let target = total * Double(k) / Double(n - 1)
            return XY(Stats.interp(target, arc, xs), Stats.interp(target, arc, ys))
        }
    }

    public static func learnShape(_ trips: [[XY]], n: Int = 200) -> [XY] {
        let rs = trips.map { resample($0, n: n) }
        return (0..<n).map { i in XY(Stats.median(rs.map { $0[i].x }), Stats.median(rs.map { $0[i].y })) }
    }

    /// DBSCAN labels (-1 = noise). A point is "core" if it has >= minSamples neighbours within eps, counting itself.
    static func dbscan(_ pts: [XY], eps: Double, minSamples: Int) -> [Int] {
        var labels = [Int](repeating: -2, count: pts.count)   // -2 = unvisited
        func neighbours(_ i: Int) -> [Int] { pts.indices.filter { pts[$0].distance(to: pts[i]) <= eps } }
        var cluster = 0
        for i in pts.indices where labels[i] == -2 {
            let nb = neighbours(i)
            if nb.count < minSamples { labels[i] = -1; continue }
            labels[i] = cluster
            var queue = nb.filter { $0 != i }
            var qi = 0
            while qi < queue.count {
                let j = queue[qi]; qi += 1
                if labels[j] == -1 { labels[j] = cluster }
                if labels[j] != -2 { continue }
                labels[j] = cluster
                let nbj = neighbours(j)
                if nbj.count >= minSamples { queue.append(contentsOf: nbj) }
            }
            cluster += 1
        }
        return labels
    }

    /// Ordered stop positions along `shape`.
    public static func learnStops(pausesPerTrip: [[XY]], shape: [XY]) -> [XY] {
        let nTrips = pausesPerTrip.count
        var pts: [XY] = [], tripOf: [Int] = []
        for (i, ps) in pausesPerTrip.enumerated() { for p in ps { pts.append(p); tripOf.append(i) } }
        guard !pts.isEmpty else { return [] }
        let labels = dbscan(pts, eps: 30, minSamples: 2)
        let need = Int((0.6 * Double(nTrips)).rounded(.up))
        var centers: [XY] = []
        for lab in Set(labels).subtracting([-1]).sorted() {
            let idx = labels.indices.filter { labels[$0] == lab }
            guard Set(idx.map { tripOf[$0] }).count >= need else { continue }
            centers.append(XY(idx.map { pts[$0].x }.reduce(0, +) / Double(idx.count), idx.map { pts[$0].y }.reduce(0, +) / Double(idx.count)))
        }
        func along(_ c: XY) -> Int { shape.indices.min { shape[$0].distance(to: c) < shape[$1].distance(to: c) }! }
        return centers.sorted { along($0) < along($1) }
    }

    /// Seconds between consecutive stop arrivals on ONE trip -> rows for segment_times.
    public static func segmentDurations(_ stopTimes: [Double]) -> [Double] { zip(stopTimes, stopTimes.dropFirst()).map { $1 - $0 } }
}

/// ETA with ranges.
///
/// THE IDEA: if the bus is on segment i and we want stop s, add up how long each remaining segment usually takes, then
/// scale by how fast THIS bus is running today versus usual.
///
/// THE MATH:  ETA = delta * sum_{k=i}^{s-1} median_time[k];  delta = (today's elapsed time) / (sum of median times of the
/// completed segments), clipped to [0.7, 1.8]. eta_lo / eta_hi use the 20th / 80th percentile segment times.
/// With no LIVE/RECENT track -> ESTIMATE from historical medians, or NO_DATA if fewer than 5 trips.
public enum ETA {
    public static let deltaMin = 0.7, deltaMax = 1.8

    public static func delta(elapsedS: Double, completedMediansS: [Double]) -> Double {
        let total = completedMediansS.reduce(0, +)
        return total <= 0 ? 1.0 : min(max(elapsedS / total, deltaMin), deltaMax)
    }
    /// segTimes[k] = observed durations of segment k. Returns (eta, lo, hi) in seconds.
    public static func seconds(segTimes: [[Double]], from i: Int, to s: Int, delta: Double) -> (eta: Double, lo: Double, hi: Double) {
        let segs = segTimes[min(i, segTimes.count)..<min(max(s, i), segTimes.count)]
        return (delta * segs.map { Stats.median($0) }.reduce(0, +), delta * segs.map { Stats.percentile($0, 20) }.reduce(0, +), delta * segs.map { Stats.percentile($0, 80) }.reduce(0, +))
    }
    public static func source(nTrips: Int, hasLiveOrRecent: Bool) -> BusSource {
        if hasLiveOrRecent { return .live }   // the caller downgrades to RECENT using the track's age
        return nTrips >= EngineConfig.minTripsToLearn ? .estimate : .noData
    }
}
