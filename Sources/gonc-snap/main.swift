import SwiftUI
import AppKit
import GoNCCore
import GoNCUI

// gonc-snap: renders screens to PNG headlessly so the design can be reviewed without a simulator.
//   swift run gonc-snap <output-dir>
@MainActor func render<V: View>(_ view: V, _ name: String, dir: String, scheme: ColorScheme = .light, height: CGFloat = 844) {
    // A real (offscreen) window so buttons, scroll views and fonts draw exactly as they do in the app.
    let hosting = NSHostingView(rootView: view.buttonStyle(.plain).tint(GN.brand).frame(width: 390, height: height).background(GN.bg))
    hosting.frame = NSRect(x: 0, y: 0, width: 390, height: height)
    let window = NSWindow(contentRect: hosting.frame, styleMask: [.borderless], backing: .buffered, defer: false)
    window.appearance = NSAppearance(named: scheme == .dark ? .darkAqua : .aqua)
    window.contentView = hosting
    window.setFrameOrigin(NSPoint(x: -4000, y: -4000))
    window.orderFront(nil)
    for _ in 0..<6 { RunLoop.current.run(until: Date().addingTimeInterval(0.15)); hosting.layoutSubtreeIfNeeded() }
    guard let rep = hosting.bitmapImageRepForCachingDisplay(in: hosting.bounds) else { print("failed:", name); return }
    hosting.cacheDisplay(in: hosting.bounds, to: rep)
    try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: "\(dir)/\(name).png"))
    window.orderOut(nil)
    print("wrote", name)
}

@MainActor func main() {
    _ = NSApplication.shared
    GNFont.register()
    let dir = CommandLine.arguments.dropFirst().first ?? "snaps"
    try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)

    let kid = Child(name: "Maya", city: "Cary", school: "Cary High School", districtCode: "67500", bus: "412", stop: "Oak Lane", walkMin: 5)
    func parentModel(demo: Bool = false) -> AppModel { let m = AppModel(store: MemoryStore(), backend: OfflineBackend()); m.children = [kid]; m.mode = .parent; m.demo = demo; return m }
    let live = StatusRow(routeLabel: "412", stopId: "Oak Lane", stopsAway: 4, etaMin: 9, etaLo: 7, etaHi: 11, source: .live)

    for scheme in [ColorScheme.light, .dark] {
        let s = scheme == .light ? "light" : "dark"
        render(WelcomeView {}, "01-welcome-\(s)", dir: dir, scheme: scheme)
        render(RoleSelectView(onRider: {}, onParent: {}, onBack: {}), "02-role-\(s)", dir: dir, scheme: scheme)
        render(RiderSetupView(model: AppModel(store: MemoryStore(), backend: OfflineBackend())), "03-rider-setup-\(s)", dir: dir, scheme: scheme)
        render(ParentSetupView(model: AppModel(store: MemoryStore(), backend: OfflineBackend())), "04-parent-setup-\(s)", dir: dir, scheme: scheme)
        render(ParentTodayView(model: parentModel(), previewRow: live), "05-parent-today-live-\(s)", dir: dir, scheme: scheme)
        render(ParentTodayView(model: parentModel()), "06-parent-today-nodata-\(s)", dir: dir, scheme: scheme)
        let rider = AppModel(store: MemoryStore(), backend: OfflineBackend()); rider.mode = .rider; rider.riderName = "Taqi"; rider.declaredBus = "412"
        render(RiderHomeView(model: rider), "07-rider-home-\(s)", dir: dir, scheme: scheme)
        render(TermsAgreementView(onAgree: {}, onBack: {}), "08-terms-\(s)", dir: dir, scheme: scheme, height: 1400)
        render(NotificationSettingsView(model: parentModel()), "09-notifications-\(s)", dir: dir, scheme: scheme, height: 1000)
        let withRides = AppModel(store: MemoryStore(), backend: OfflineBackend()); withRides.mode = .rider
        withRides.rides = [Ride(id: "a", startedAt: Date().addingTimeInterval(-3600), endedAt: Date().addingTimeInterval(-2500), bus: "412", published: true, maxRiders: 4),
                           Ride(id: "b", startedAt: Date().addingTimeInterval(-90000), endedAt: Date().addingTimeInterval(-88900), bus: "412", published: false, maxRiders: 2)]
        render(PastRidesView(model: withRides), "10-past-rides-\(s)", dir: dir, scheme: scheme)
        render(DeleteAccountView(model: parentModel()), "11-delete-\(s)", dir: dir, scheme: scheme, height: 1000)
    }
    render(SettingsView(model: parentModel()), "12-settings-light", dir: dir)
}
MainActor.assumeIsolated { main() }
