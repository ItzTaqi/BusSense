import SwiftUI
import CoreLocation
import GoNCCore

struct StepHeader: View {
    let step: Int; let total: Int; let back: () -> Void
    var body: some View {
        HStack(spacing: 10) {
            Button(action: back) { Image(systemName: "chevron.left").font(.system(size: 18, weight: .semibold)).foregroundStyle(GN.brand).frame(width: 40, height: 40) }.buttonStyle(.plain).accessibilityLabel("Back")
            ProgressSteps(step: step, total: total)
            Color.clear.frame(width: 40, height: 40)
        }
    }
}
struct StepTitle: View {
    let title: String; var sub: String? = nil
    var body: some View {
        VStack(spacing: 6) {
            Text(title).font(.system(size: 22, weight: .heavy)).foregroundStyle(GN.ink).multilineTextAlignment(.center).accessibilityAddTraits(.isHeader)
            if let sub { Text(sub).font(.system(size: 14)).foregroundStyle(GN.sub).multilineTextAlignment(.center) }
        }
    }
}
struct PointRow: View {
    let icon: String; let text: String
    var body: some View {
        HStack(spacing: 12) { IconBubble(icon, bg: GN.card); Text(text).font(.system(size: 15)).foregroundStyle(GN.ink); Spacer(minLength: 0) }
            .padding(12).background(GN.cardAlt, in: RoundedRectangle(cornerRadius: 14))
    }
}

/// City first, then a school list for that city. "My school isn't listed" lets a student type their own.
struct SchoolPicker: View {
    @Binding var city: String; @Binding var school: String; @Binding var district: String
    var notListed = "My school isn't listed"
    @State private var other = false
    var body: some View {
        VStack(spacing: 12) {
            SelectField("City", placeholder: "City", options: Schools.cities, selection: Binding(get: { city }, set: { v in
                city = v; school = ""; other = false
                if district.isEmpty, let d = Districts.defaultFor(city: v) { district = d.label }
            }))
            if other { GNTextField("School name", text: $school) }
            else {
                SelectField("School", placeholder: city.isEmpty ? "Choose a city first" : "School", options: Schools.schools(in: city), selection: $school, disabled: city.isEmpty,
                            otherLabel: notListed, onOther: { other = true; school = "" })
            }
        }
    }
}
struct DistrictPicker: View {
    @Binding var district: String; @Binding var otherCode: String; @Binding var useOther: Bool
    var body: some View {
        if useOther { GNTextField("5-digit district code", text: $otherCode, maxLength: 5, numeric: true) }
        else {
            SelectField("District", placeholder: "District", options: Districts.all.map(\.label), selection: $district,
                        otherLabel: "My district isn't listed (enter code)", onOther: { useOther = true; district = "" })
        }
    }
}
extension Districts {
    static func code(label: String, otherCode: String, useOther: Bool) -> String { useOther ? otherCode.trimmingCharacters(in: .whitespaces) : (byLabel(label)?.code ?? "") }
}

/// Asks the phone for location permission. A "no" is fine: they can allow it later in Settings.
@MainActor enum LocationPermission {
    private static let manager = CLLocationManager()
    static func request() { manager.requestWhenInUseAuthorization() }
}
