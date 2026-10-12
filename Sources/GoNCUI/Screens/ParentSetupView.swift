import SwiftUI
import GoNCCore

/// Parent setup: a few short screens, one question each. Finishing adds a child and opens the parent interface.
public struct ParentSetupView: View {
    @Bindable var model: AppModel
    var adding = false
    @State private var step: Int
    @State private var name = ""
    @State private var city = ""
    @State private var school = ""
    @State private var district = ""
    @State private var otherCode = ""
    @State private var useOtherDistrict = false
    @State private var bus = ""
    @State private var stop = ""
    @State private var walk = "5 min"
    private let total = 6
    public init(model: AppModel, adding: Bool = false) { self.model = model; self.adding = adding; _step = State(initialValue: adding ? 1 : 0) }

    private var districtCode: String { Districts.code(label: district, otherCode: otherCode, useOther: useOtherDistrict) }
    private static let walkOptions = (1...15).map { "\($0) min" }
    private var childName: String { name.trimmingCharacters(in: .whitespaces) }

    private func back() { if step == 0 || (adding && step == 1) { if adding { model.addingChild = false } else { model.stage = .role } } else { step -= 1 } }
    private func finish(alerts: Bool) async {
        if alerts { await NotificationService.request() }
        model.addChild(Child(name: childName.isEmpty ? "My child" : childName, city: city, school: school, districtCode: districtCode,
                             bus: bus.trimmingCharacters(in: .whitespaces), stop: stop.trimmingCharacters(in: .whitespaces), walkMin: Int(walk.split(separator: " ")[0]) ?? 5))
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                StepHeader(step: step + 1, total: total, back: back)
                switch step {
                case 0:
                    IconBubble("person.2.fill", size: 72).padding(.top, 12)
                    StepTitle(title: "Welcome, parent", sub: "Follow your child's bus in about a minute.")
                    PointRow(icon: "location.fill", text: "See where the bus is on the way to your stop.")
                    PointRow(icon: "figure.walk", text: "Get a leave-by time so no one waits in the cold.")
                    PointRow(icon: "bell.fill", text: "Get alerts when the bus is late or has passed.")
                    GNButton("Continue", kind: .primary) { step = 1 }
                case 1:
                    StepTitle(title: "Your child", sub: "A first name or nickname, only shown on your phone.")
                    GNTextField("Name or nickname", text: $name, maxLength: 20)
                    GNButton("Next", kind: .primary) { step = 2 }.disabled(childName.isEmpty)
                case 2:
                    StepTitle(title: "Their school")
                    SchoolPicker(city: $city, school: $school, district: $district, notListed: "My child's school isn't listed")
                    GNButton("Next", kind: .primary) { step = 3 }.disabled(city.isEmpty || school.trimmingCharacters(in: .whitespaces).isEmpty)
                case 3:
                    StepTitle(title: "Their bus", sub: "Find the district and bus number on your transportation notice.")
                    DistrictPicker(district: $district, otherCode: $otherCode, useOther: $useOtherDistrict)
                    GNTextField("Bus number", text: $bus, maxLength: 8)
                    GNButton("Next", kind: .primary) { step = 4 }.disabled(!Districts.isCode(districtCode) || bus.trimmingCharacters(in: .whitespaces).isEmpty)
                case 4:
                    StepTitle(title: "Your stop", sub: "Where does the bus pick up or drop off?")
                    GNTextField("Stop name or street", text: $stop, maxLength: 40)
                    Text("How long is the walk to the stop?").font(.system(size: 13, weight: .semibold)).foregroundStyle(GN.sub)
                    SelectField("Walking time", options: Self.walkOptions, selection: $walk)
                    GNButton("Next", kind: .primary) { step = 5 }.disabled(stop.trimmingCharacters(in: .whitespaces).isEmpty)
                default:
                    IconBubble("bell.fill", size: 72).padding(.top, 12)
                    StepTitle(title: "Turn on alerts?", sub: "We'll tell you when \(childName.isEmpty ? "your child" : childName)'s bus is nearly at the stop, running late, or has passed. At most one alert per stop every 5 minutes.")
                    GNButton("Turn on alerts", icon: "bell.fill", kind: .primary) { Task { await finish(alerts: true) } }
                    GNButton("Not now") { Task { await finish(alerts: false) } }
                }
            }
            .padding(20).frame(maxWidth: 420)
        }
        .scrollDismissesKeyboard(.interactively).background(GN.bg)
    }
}
