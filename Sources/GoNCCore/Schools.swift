import Foundation

public enum Schools {
    public static let cities: [String] = SchoolsData.byCity.keys.sorted()

    private static func rank(_ n: String) -> Int {
        let l = n.lowercased()
        if l.contains("high") { return 0 }
        if l.contains("middle") || l.contains("junior") { return 1 }
        if l.contains("elementary") || l.contains("primary") { return 3 }
        return 2
    }
    /// High schools first, then middle, other, elementary; alphabetical inside each group.
    public static func schools(in city: String) -> [String] {
        (SchoolsData.byCity[city] ?? []).sorted { a, b in
            let ra = rank(a), rb = rank(b)
            return ra != rb ? ra < rb : a.localizedCompare(b) == .orderedAscending
        }
    }
}
