import SwiftUI
import GoNCCore

/// Parent "Today": the followed child's bus. Polls the server every 15 s (or plays the scripted demo).
public struct ParentTodayView: View {
    @Bindable var model: AppModel
    @State private var row: StatusRow?
    /// Lets previews and snapshots show a specific status without a server.
    public init(model: AppModel, previewRow: StatusRow? = nil) { self.model = model; _row = State(initialValue: previewRow); self.hasPreview = previewRow != nil }
    private let hasPreview: Bool

    private var child: Child? { model.child }
    private var leave: Int? { guard let c = child, let lo = row?.etaLo else { return nil }; return LeaveBy.minutes(etaLo: lo, walkMin: c.walkMin) }

    public var body: some View {
        ScrollView {
            if let child {
                VStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(Date.now.formatted(.dateTime.weekday(.wide).month(.abbreviated).day())).font(.system(size: 13, weight: .semibold)).foregroundStyle(GN.sub)
                        Text("\(child.name)'s bus").font(.system(size: 26, weight: .heavy)).tracking(-0.6).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
                    }.frame(maxWidth: .infinity, alignment: .leading)

                    if !model.demo && model.children.count > 1 { chips }

                    Hero {
                        Text("Bus \(child.bus) · \(child.school.isEmpty ? "School" : child.school)").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.85))
                        SourceBadge(row?.source ?? .noData)
                        if let eta = row?.etaMin {
                            (Text("\(Int(eta.rounded()))").font(.system(size: 60, weight: .heavy)).tracking(-2) + Text(" min").font(.system(size: 22, weight: .bold)))
                                .foregroundStyle(.white).accessibilityLabel("Arrives in about \(Int(eta.rounded())) minutes")
                            if let lo = row?.etaLo, let hi = row?.etaHi { Text("Likely between \(Int(lo.rounded())) and \(Int(hi.rounded())) min").font(.system(size: 15)).foregroundStyle(.white.opacity(0.92)) }
                        } else {
                            Text("Not on the map yet. A bus shows once 3 or more riders are aboard.").font(.system(size: 15)).foregroundStyle(.white).multilineTextAlignment(.center).padding(.vertical, 8)
                        }
                        RouteTrack(stopsAway: row?.stopsAway)
                    }

                    if let leave {
                        HStack(spacing: 14) {
                            Image(systemName: "figure.walk").font(.system(size: 28))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(leave == 0 ? "Leave now" : "Leave in about \(leave) min").font(.system(size: 18, weight: .heavy))
                                Text("\(child.stop) · \(child.walkMin) min walk + 2 min cushion").font(.system(size: 13)).opacity(0.85)
                            }
                            Spacer()
                        }
                        .foregroundStyle(GN.onBrand).padding(16).background(GN.brand, in: RoundedRectangle(cornerRadius: 18)).accessibilityElement(children: .combine)
                    }

                    ReportButton { kind in
                        guard !model.demo else { return true }
                        return (try? await model.backend.submitReport(route: child.bus, stop: child.stop, kind: kind)) != nil
                    }
                }
                .padding(16)
            } else {
                Text("No child added yet. Open Settings to add one.").foregroundStyle(GN.sub).padding(24)
            }
        }
        .background(GN.bg)
        .task(id: "\(model.child?.id ?? "")-\(model.demo)") { await poll() }
    }

    private var chips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(model.children.enumerated()), id: \.element.id) { i, k in
                    let on = i == model.activeChild
                    Button { model.activeChild = i } label: {
                        Label(k.name, systemImage: "person.crop.circle.fill").font(.system(size: 14, weight: .bold))
                            .foregroundStyle(on ? GN.onBrand : GN.ink).padding(.vertical, 8).padding(.horizontal, 14).background(on ? GN.brand : GN.cardAlt, in: Capsule())
                    }
                    .accessibilityLabel("\(k.name), bus \(k.bus)").accessibilityAddTraits(on ? [.isSelected] : [])
                }
            }
        }
    }

    private func poll() async {
        if hasPreview { return }
        row = nil
        guard let child else { return }
        if model.demo {
            for step in DemoScenario.steps { row = step; try? await Task.sleep(nanoseconds: 4_000_000_000); if Task.isCancelled { return } }
            return
        }
        while !Task.isCancelled {
            if let rows = try? await model.backend.busStatus(route: child.bus) { row = rows.first { $0.stopId == child.stop } ?? rows.first }
            try? await Task.sleep(nanoseconds: 15_000_000_000)
        }
    }
}
