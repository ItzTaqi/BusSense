import SwiftUI
import GoNCCore

/// Rider home: the date and "<name>'s bus", a status card, one main button, and a quiet "Not riding today".
public struct RiderHomeView: View {
    @Bindable var model: AppModel
    public init(model: AppModel) { self.model = model }
    private var listening: Bool { model.riderStatus == .listening || model.riderStatus == .onBus }
    private var statusText: String {
        switch model.riderStatus {
        case .onBus: return "On Bus \(model.declaredBus) · \(model.kRiders) riders"
        case .listening: return L10n.t("rider.listening", model.language)
        case .paused: return L10n.t("rider.paused", model.language)
        case .sleeping: return L10n.t("rider.sleeping", model.language)
        }
    }
    public var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(Date.now.formatted(.dateTime.weekday(.wide).month(.abbreviated).day())).font(.system(size: 13, weight: .semibold)).foregroundStyle(GN.sub)
                    Text(model.riderName.isEmpty ? "My bus" : "\(model.riderName)'s bus").font(.system(size: 26, weight: .heavy)).tracking(-0.6).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
                }.frame(maxWidth: .infinity, alignment: .leading)

                Hero {
                    HStack(spacing: 10) {
                        if listening { PulseDot(color: .white) }
                        Text(statusText).font(.system(size: 26, weight: .heavy)).tracking(-0.6).foregroundStyle(.white).multilineTextAlignment(.center).accessibilityAddTraits(.isHeader)
                    }
                    Text("A bus is shown to parents only when 3 or more riders are on it.").font(.system(size: 16)).foregroundStyle(.white.opacity(0.88)).multilineTextAlignment(.center)
                    if model.riderStatus == .onBus { SourceBadge(.live) }
                }
                if !listening { GNButton("I'm on the bus", icon: "bus.fill", kind: .primary) { Task { await model.startTrip() } } }
                else { GNButton("End trip", icon: "stop.circle.fill", kind: .danger) { Task { await model.endTrip() } } }
                if let e = model.tripError { Text(e).font(.system(size: 14)).foregroundStyle(GN.danger).multilineTextAlignment(.center) }
                Button(model.riderStatus == .paused ? "Back to normal" : "Not riding today") { model.toggleNotRidingToday() }
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(GN.brand).buttonStyle(.plain).frame(minHeight: 48)
            }
            .padding(16)
        }
        .background(GN.bg)
    }
}
