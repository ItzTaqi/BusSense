import Foundation

/// Here Comes the Bus (Synovia) district codes for NC districts, as published on district/vendor pages (docs/DISTRICT_CODES.md).
/// Each district sets its own code; a code identifies the DISTRICT's tracking system, not a bus.
/// Verify with the district's transportation office before relying on one.
public struct District: Equatable, Hashable, Sendable {
    public let name: String
    public let code: String
    public var label: String { "\(name) · \(code)" }
}

public enum Districts {
    public static let all: [District] = [
        District(name: "Wake County (yellow bus)", code: "67500"),
        District(name: "Wake County (vendor bus)", code: "67501"),
        District(name: "Charlotte-Mecklenburg", code: "73877"),
        District(name: "Johnston County", code: "76361"),
        District(name: "Granville County", code: "82346"),
        District(name: "Bladen County", code: "75971"),
        District(name: "Wilson County", code: "13509"),
    ]
    public static func isCode(_ s: String) -> Bool {
        let t = s.trimmingCharacters(in: .whitespaces)
        return t.count == 5 && t.allSatisfy { $0.isASCII && $0.isNumber }
    }
    public static func byLabel(_ label: String) -> District? { all.first { $0.label == label } }

    public static let wakeCities = ["Apex", "Cary", "Fuquay-Varina", "Garner", "Holly Springs", "Knightdale", "Morrisville", "Raleigh", "Rolesville", "Wake Forest", "Wendell", "Zebulon"]
    /// Wake County cities default to the WCPSS yellow-bus code.
    public static func defaultFor(city: String) -> District? { wakeCities.contains(city) ? all[0] : nil }
}
