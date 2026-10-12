import SwiftUI
import GoNCCore

/// Rider setup: name -> birthday -> bus -> bus times -> location -> motion. Every step has a back arrow; on the first it goes home.
public struct RiderSetupView: View {
    @Bindable var model: AppModel
    @State private var step = 0
    @State private var name = ""
    @State private var dob: YMD?
    @State private var city = ""
    @State private var school = ""
    @State private var district = ""
    @State private var otherCode = ""
    @State private var useOtherDistrict = false
    @State private var bus = ""
    @State private var studentId = ""
    @State private var pickup = ""
    @State private var leave = ""
    @State private var ineligible = false
    public init(model: AppModel) { self.model = model }
    private let total = 6

    private var districtCode: String { Districts.code(label: district, otherCode: otherCode, useOther: useOtherDistrict) }
    private var busValid: Bool { !city.isEmpty && !school.trimmingCharacters(in: .whitespaces).isEmpty && Districts.isCode(districtCode) && !bus.trimmingCharacters(in: .whitespaces).isEmpty && Times.isStudentID(studentId) }

    private func finish() {
        guard let dob, let p = Times.parse(pickup), let l = Times.parse(leave) else { return }
        model.finishRider(name: name.trimmingCharacters(in: .whitespaces), dob: dob, schoolId: "\(city) · \(school)", bus: bus.trimmingCharacters(in: .whitespaces),
                          districtCode: districtCode, studentId: studentId.trimmingCharacters(in: .whitespaces), pickupMin: p, leaveMin: l)
    }

    public var body: some View {
        ScrollView {
            if ineligible { notEligible } else { steps }
        }
        .scrollDismissesKeyboard(.interactively).background(GN.bg)
    }

    private var notEligible: some View {
        VStack(spacing: 14) {
            Spacer(minLength: 60)
            IconBubble("checkmark.shield.fill", size: 64)
            Text(Eligibility.ineligibleTitle).font(.system(size: 22, weight: .bold)).foregroundStyle(GN.ink).multilineTextAlignment(.center).accessibilityAddTraits(.isHeader)
            Text(Eligibility.ineligibleBody).font(.system(size: 15)).foregroundStyle(GN.sub).multilineTextAlignment(.center)
            GNButton("A parent can use Parent mode", icon: "person.2.fill", kind: .primary) { model.stage = .parentSetup }
            GNButton("Change my birthday") { ineligible = false; dob = nil }
            GNButton("Back to home") { model.stage = .welcome }
        }
        .padding(24)
    }

    private var steps: some View {
        VStack(spacing: 14) {
            StepHeader(step: step + 1, total: total) { if step == 0 { model.stage = .welcome } else { step -= 1 } }
            switch step {
            case 0:
                StepTitle(title: "What's your name?", sub: "A first name or nickname. It only shows on your phone.")
                GNTextField("Name or nickname", text: $name, maxLength: 20)
                GNButton("Next", kind: .primary) { step = 1 }.disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
            case 1:
                StepTitle(title: "Your birthday", sub: "Riders under 13 use Parent mode only. Your birthday stays on your phone.")
                BirthdayField(value: $dob)
                GNButton("Next", kind: .primary) { if let dob, Eligibility.isEligibleRider(dob) { step = 2 } else { ineligible = true } }.disabled(dob == nil)
            case 2:
                StepTitle(title: "Your bus")
                SchoolPicker(city: $city, school: $school, district: $district)
                DistrictPicker(district: $district, otherCode: $otherCode, useOther: $useOtherDistrict)
                GNTextField("Bus number", text: $bus, maxLength: 8)
                GNTextField("Student ID number", text: $studentId, maxLength: 12, numeric: true)
                Text("Your student ID is used only to find your assigned bus.").font(.system(size: 12)).foregroundStyle(GN.sub)
                GNButton("Next", kind: .primary) { step = 3 }.disabled(!busValid)
            case 3:
                StepTitle(title: "Bus times", sub: "We only listen around these times.")
                Text("What time does your bus usually come?").font(.system(size: 13, weight: .semibold)).foregroundStyle(GN.sub)
                SelectField("Bus comes (morning)", placeholder: "Choose time", options: Times.morningOptions, selection: $pickup)
                Text("What time does it usually leave school?").font(.system(size: 13, weight: .semibold)).foregroundStyle(GN.sub)
                SelectField("Bus leaves school (afternoon)", placeholder: "Choose time", options: Times.afternoonOptions, selection: $leave)
                GNButton("Next", kind: .primary) { step = 4 }.disabled(Times.parse(pickup) == nil || Times.parse(leave) == nil)
            case 4:
                StepTitle(title: "Allow location")
                PointRow(icon: "location.fill", text: "We need your location to find your bus and the bus closest to you.")
                PointRow(icon: "person.2.fill", text: "A bus is only shown when 3+ riders are on it.")
                PointRow(icon: "heart.fill", text: "Your location also helps other riders find their bus.")
                GNButton("Allow location", icon: "location.fill", kind: .primary) { LocationPermission.request(); step = 5 }
                GNButton("Not now") { step = 5 }
            default:
                StepTitle(title: "Motion sensors", sub: "Motion helps tell a bus from a car. It stays on your phone.")
                GNButton("Finish setup", kind: .primary, action: finish)
            }
        }
        .padding(20).frame(maxWidth: 420)
    }
}
