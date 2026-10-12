import Foundation

public struct XY: Equatable, Sendable {
    public var x: Double, y: Double
    public init(_ x: Double, _ y: Double) { self.x = x; self.y = y }
    public static func - (a: XY, b: XY) -> XY { XY(a.x - b.x, a.y - b.y) }
    public var length: Double { (x * x + y * y).squareRoot() }
    public func distance(to o: XY) -> Double { (self - o).length }
}

/// A timestamped projected position (metres, EPSG:32617).
public struct Sample: Equatable, Sendable {
    public var t: Double, x: Double, y: Double
    public init(t: Double, x: Double, y: Double) { self.t = t; self.x = x; self.y = y }
    public var xy: XY { XY(x, y) }
}
public typealias Trace = [Sample]

/// WGS84 latitude/longitude <-> UTM zone 17N (EPSG:32617, Wake County), via the Krueger series (accurate to millimetres).
public enum UTM17N {
    private static let a = 6378137.0, f = 1 / 298.257223563, k0 = 0.9996, e0 = 500000.0
    private static let lon0 = -81.0 * Double.pi / 180
    private static var n: Double { f / (2 - f) }
    private static var bigA: Double { a / (1 + n) * (1 + n * n / 4 + pow(n, 4) / 64) }

    public static func forward(lat: Double, lon: Double) -> XY {
        let n = self.n, phi = lat * .pi / 180, dl = lon * .pi / 180 - lon0
        let alpha = [n / 2 - 2 * n * n / 3 + 5 * pow(n, 3) / 16, 13 * n * n / 48 - 3 * pow(n, 3) / 5, 61 * pow(n, 3) / 240]
        let c = 2 * n.squareRoot() / (1 + n)
        let t = sinh(atanh(sin(phi)) - c * atanh(c * sin(phi)))
        let xi = atan2(t, cos(dl)), eta = atanh(sin(dl) / (1 + t * t).squareRoot())
        var xs = xi, es = eta
        for j in 1...3 { let jj = Double(j); xs += alpha[j - 1] * sin(2 * jj * xi) * cosh(2 * jj * eta); es += alpha[j - 1] * cos(2 * jj * xi) * sinh(2 * jj * eta) }
        return XY(e0 + k0 * bigA * es, k0 * bigA * xs)
    }

    public static func inverse(_ p: XY) -> (lat: Double, lon: Double) {
        let n = self.n
        let beta = [n / 2 - 2 * n * n / 3 + 37 * pow(n, 3) / 96, n * n / 48 + pow(n, 3) / 15, 17 * pow(n, 3) / 480]
        let delta = [2 * n - 2 * n * n / 3 - 2 * pow(n, 3), 7 * n * n / 3 - 8 * pow(n, 3) / 5, 56 * pow(n, 3) / 15]
        let xi = p.y / (k0 * bigA), eta = (p.x - e0) / (k0 * bigA)
        var xp = xi, ep = eta
        for j in 1...3 { let jj = Double(j); xp -= beta[j - 1] * sin(2 * jj * xi) * cosh(2 * jj * eta); ep -= beta[j - 1] * cos(2 * jj * xi) * sinh(2 * jj * eta) }
        let chi = asin(sin(xp) / cosh(ep))
        var phi = chi
        for j in 1...3 { phi += delta[j - 1] * sin(2 * Double(j) * chi) }
        return (phi * 180 / .pi, (lon0 + atan2(sinh(ep), cos(xp))) * 180 / .pi)
    }
}

enum Stats {
    /// numpy-style linear-interpolation percentile, q in 0...100.
    static func percentile(_ values: [Double], _ q: Double) -> Double {
        precondition(!values.isEmpty)
        let s = values.sorted()
        let idx = q / 100 * Double(s.count - 1)
        let lo = Int(idx.rounded(.down)), hi = Int(idx.rounded(.up))
        return s[lo] + (s[hi] - s[lo]) * (idx - Double(lo))
    }
    static func median(_ values: [Double]) -> Double { percentile(values, 50) }
    static func interp(_ x: Double, _ xs: [Double], _ ys: [Double]) -> Double {   // np.interp: clamps at the ends
        if x <= xs[0] { return ys[0] }
        if x >= xs[xs.count - 1] { return ys[ys.count - 1] }
        var lo = 0, hi = xs.count - 1
        while hi - lo > 1 { let mid = (lo + hi) / 2; if xs[mid] <= x { lo = mid } else { hi = mid } }
        let span = xs[hi] - xs[lo]
        return span == 0 ? ys[lo] : ys[lo] + (ys[hi] - ys[lo]) * (x - xs[lo]) / span
    }
}
