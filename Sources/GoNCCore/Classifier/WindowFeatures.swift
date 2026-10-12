import Foundation

/// Features over a rolling 180 s window of 5 s samples. Each row is [speed_mps, heading_deg, accel_vertical].
public enum WindowFeatures {
    public static let names = ["stops_per_km", "max_speed", "mean_accel_out_of_stops", "frac_stationary", "heading_change_rate_low_speed", "accel_vertical_variance"]
    public static let dt = 5.0
    static let stopSpeed = 1.0

    private static func stopRuns(_ slow: [Bool]) -> [(Int, Int)] {
        var runs: [(Int, Int)] = []
        var i = 0
        while i < slow.count {
            if slow[i] {
                var j = i
                while j + 1 < slow.count && slow[j + 1] { j += 1 }
                let dur = Double(j - i + 1) * dt
                if dur >= 8 && dur <= 90 { runs.append((i, j)) }
                i = j + 1
            } else { i += 1 }
        }
        return runs
    }

    private static func mean(_ a: [Double]) -> Double { a.isEmpty ? 0 : a.reduce(0, +) / Double(a.count) }

    public static func compute(_ window: [[Double]]) -> [Double] {
        let v = window.map { $0[0] }, hdg = window.map { $0[1] }, az = window.map { $0[2] }
        let slow = v.map { $0 < stopSpeed }
        let runs = stopRuns(slow)
        let km = max(v.reduce(0, +) * dt / 1000, 0.05)
        let last = v.count - 1
        let accels = runs.map { (v[min($0.1 + 3, last)] - v[min($0.1 + 1, last)]) / (2 * dt) }
        var dh: [Double] = []
        for i in 0..<max(0, v.count - 1) where v[i + 1] < 3 && v[i] < 3 {
            var d = (hdg[i + 1] - hdg[i] + 180).truncatingRemainder(dividingBy: 360)
            if d < 0 { d += 360 }
            dh.append(abs(d - 180))
        }
        let mu = mean(az)
        let variance = mean(az.map { ($0 - mu) * ($0 - mu) })
        return [Double(runs.count) / km, v.max() ?? 0, mean(accels), mean(slow.map { $0 ? 1.0 : 0.0 }), dh.isEmpty ? 0 : mean(dh) / dt, variance]
    }
}
