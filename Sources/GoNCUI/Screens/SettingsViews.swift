import SwiftUI
import GoNCCore

/// One place for everything that is not the main job: notifications, privacy, past rides, appearance, language, demo.
public struct SettingsView: View {
    @Bindable var model: AppModel
    public init(model: AppModel) { self.model = model }

    private func row(_ icon: String, _ label: String, hint: String? = nil, right: String? = nil) -> some View {
        HStack(spacing: 16) {
            IconBubble(icon, size: 40)
            VStack(alignment: .leading, spacing: 4) {
                Text(label).font(.system(size: 16, weight: .semibold)).foregroundStyle(GN.ink)
                if let hint { Text(hint).font(.system(size: 13)).foregroundStyle(GN.sub) }
            }
            Spacer()
            if let right { Text(right).font(.system(size: 14, weight: .semibold)).foregroundStyle(GN.sub) }
            Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(GN.sub)
        }
        .padding(.horizontal, 18).padding(.vertical, 14).frame(minHeight: 72).contentShape(Rectangle())
    }
    private func group<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        VStack(spacing: 0) { content() }
            .background(GN.card, in: RoundedRectangle(cornerRadius: 16)).overlay(RoundedRectangle(cornerRadius: 16).stroke(GN.line, lineWidth: 1))
    }
    private var divider: some View { Divider().overlay(GN.line).padding(.leading, 74) }

    public var body: some View {
        NavigationStack(path: $model.settingsPath) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    Text("Settings").font(.system(size: 24, weight: .heavy)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
                    group {
                        if model.mode == .parent { NavigationLink(value: SettingsPage.notifications) { row("bell.fill", "Notifications", hint: "Alerts, quiet hours") }; divider }
                        NavigationLink(value: SettingsPage.privacy) { row("checkmark.shield.fill", "Privacy and Terms", hint: "How your data is used") }
                        if model.mode == .rider { divider; NavigationLink(value: SettingsPage.rides) { row("clock.fill", "Past rides", hint: "Your trips and whether the bus was shown") } }
                    }
                    if model.mode == .parent {
                        group {
                            ForEach(Array(model.children.enumerated()), id: \.element.id) { i, k in
                                HStack(spacing: 16) {
                                    IconBubble("person.crop.circle.fill", size: 40)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(k.name).font(.system(size: 16, weight: .semibold)).foregroundStyle(GN.ink)
                                        Text("Bus \(k.bus) · \(k.stop)").font(.system(size: 13)).foregroundStyle(GN.sub)
                                    }
                                    Spacer()
                                    Button { model.removeChild(k.id) } label: { Image(systemName: "trash").foregroundStyle(GN.danger).padding(10) }.buttonStyle(.plain).accessibilityLabel("Remove \(k.name)")
                                }
                                .padding(.horizontal, 18).padding(.vertical, 14).frame(minHeight: 72)
                                divider
                            }
                            Button { model.addingChild = true } label: { row("plus.circle.fill", "Add a child") }.buttonStyle(.plain)
                        }
                    }
                    VStack(alignment: .leading, spacing: 10) {
                        Text("APPEARANCE").font(.system(size: 13, weight: .bold)).tracking(0.6).foregroundStyle(GN.sub)
                        HStack(spacing: 0) {
                            ForEach(Appearance.allCases, id: \.self) { a in
                                let on = model.appearance == a
                                Button { model.setAppearance(a) } label: {
                                    Label(a.rawValue.capitalized, systemImage: a == .system ? "iphone" : a == .light ? "sun.max.fill" : "moon.fill").font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(on ? GN.onBrand : GN.ink).frame(maxWidth: .infinity, minHeight: 48).background(on ? GN.brand : .clear, in: RoundedRectangle(cornerRadius: 12))
                                }
                                .accessibilityLabel("\(a.rawValue) appearance").accessibilityAddTraits(on ? [.isSelected] : [])
                            }
                        }
                        .padding(4).background(GN.cardAlt, in: RoundedRectangle(cornerRadius: 16))
                        Text(model.appearance == .system ? "Matches your phone's light or dark setting." : "Always \(model.appearance.rawValue), whatever your phone is set to.").font(.system(size: 12)).foregroundStyle(GN.sub)
                    }
                    group {
                        Button { model.language = model.language == .en ? .es : .en } label: { row("globe", "Language", right: model.language.name) }.buttonStyle(.plain)
                        divider
                        Button { model.demo = true } label: { row("play.circle.fill", "Demo", hint: "Sample stop board, not real data") }.buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
            .background(GN.bg)
            .navigationDestination(for: SettingsPage.self) { page in
                ScrollView {
                    switch page {
                    case .notifications: NotificationSettingsView(model: model)
                    case .privacy: PrivacyView(model: model)
                    case .rides: PastRidesView(model: model)
                    }
                }
                .background(GN.bg)
                #if os(iOS)
                .navigationBarTitleDisplayMode(.inline)
                #endif
            }
        }
    }
}

/// Parent alerts and notifications: permission, the four alert switches, quiet hours.
public struct NotificationSettingsView: View {
    @Bindable var model: AppModel
    @State private var permission: NotificationPermission = .notAsked
    public init(model: AppModel) { self.model = model }
    private static let quietFrom = Times.options(from: 18 * 60, to: 23 * 60 + 30)
    private static let quietTo = Times.options(from: 4 * 60, to: 9 * 60)
    private func hhmmLabel(_ s: String, fallback: Int) -> String {
        let p = s.split(separator: ":").compactMap { Int($0) }
        return Times.label(p.count == 2 ? p[0] * 60 + p[1] : fallback)
    }
    private func heading(_ t: String) -> some View { Text(t.uppercased()).font(.system(size: 13, weight: .bold)).tracking(0.6).foregroundStyle(GN.sub) }
    private func toggle(_ title: String, _ desc: String, _ keyPath: WritableKeyPath<AlertPrefs, Bool>) -> some View {
        Toggle(isOn: Binding(get: { model.alertPrefs[keyPath: keyPath] }, set: { v in var p = model.alertPrefs; p[keyPath: keyPath] = v; model.setAlertPrefs(p) })) {
            VStack(alignment: .leading, spacing: 4) { Text(title).font(.system(size: 16, weight: .bold)).foregroundStyle(GN.ink); Text(desc).font(.system(size: 13)).foregroundStyle(GN.sub) }
        }
        .tint(GN.brand).padding(.horizontal, 18).padding(.vertical, 16)
    }
    public var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 6) {
                heading("Notifications")
                VStack(alignment: .leading, spacing: 12) {
                    Text({ switch permission { case .granted: "Notifications are on."; case .denied: "Notifications are off. Turn them on in your phone's Settings."; case .notAsked: "Allow notifications so GoNC can alert you."; case .unavailable: "Notifications aren't available here." } }())
                        .font(.system(size: 15)).foregroundStyle(GN.ink)
                    if permission == .notAsked { GNButton("Allow notifications", icon: "bell.fill", kind: .primary) { Task { permission = await NotificationService.request() } } }
                }
                .padding(16).frame(maxWidth: .infinity, alignment: .leading).background(GN.card, in: RoundedRectangle(cornerRadius: 16)).overlay(RoundedRectangle(cornerRadius: 16).stroke(GN.line))
            }
            VStack(alignment: .leading, spacing: 6) {
                heading("Alert types")
                VStack(spacing: 0) {
                    toggle("Leave now", "When your bus is about to reach your stop.", \.leaveNow); Divider().overlay(GN.line)
                    toggle("Running late", "When it is 7+ minutes later than usual.", \.runningLate); Divider().overlay(GN.line)
                    toggle("Not seen yet", "No bus seen 10 minutes after the usual time.", \.notSeen); Divider().overlay(GN.line)
                    toggle("Passed your stop", "When the bus goes 100 m past your stop.", \.passed)
                }
                .background(GN.card, in: RoundedRectangle(cornerRadius: 16)).overlay(RoundedRectangle(cornerRadius: 16).stroke(GN.line))
                Text("At most one alert per stop every 5 minutes.").font(.system(size: 12)).foregroundStyle(GN.sub)
            }
            VStack(alignment: .leading, spacing: 6) {
                heading("Quiet hours")
                VStack(spacing: 12) {
                    Text("No alerts during these hours.").font(.system(size: 13)).foregroundStyle(GN.sub)
                    SelectField("From", options: Self.quietFrom, selection: Binding(get: { hhmmLabel(model.alertPrefs.quietStart, fallback: 21 * 60) }, set: { v in var p = model.alertPrefs; p.quietStart = Times.hhmm(Times.parse(v) ?? 21 * 60); model.setAlertPrefs(p) }))
                    SelectField("Until", options: Self.quietTo, selection: Binding(get: { hhmmLabel(model.alertPrefs.quietEnd, fallback: 6 * 60 + 30) }, set: { v in var p = model.alertPrefs; p.quietEnd = Times.hhmm(Times.parse(v) ?? 6 * 60 + 30); model.setAlertPrefs(p) }))
                }
                .padding(16).background(GN.card, in: RoundedRectangle(cornerRadius: 16)).overlay(RoundedRectangle(cornerRadius: 16).stroke(GN.line))
            }
        }
        .padding(20)
        .task { permission = await NotificationService.status() }
    }
}

/// Privacy and Terms with "Delete my account" at the bottom.
public struct PrivacyView: View {
    @Bindable var model: AppModel
    @State private var confirming = false
    public init(model: AppModel) { self.model = model }
    public var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            TermsContentView()
            GNButton("Delete my account", icon: "trash", kind: .danger) { confirming = true }.padding(.top, 8)
        }
        .padding(22)
        .sheet(isPresented: $confirming) { DeleteAccountView(model: model) }
    }
}

/// "Are you sure?" with the facts first. The delete button stays off until the box is ticked.
public struct DeleteAccountView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var checked = false
    @State private var phase: Phase = .idle
    enum Phase { case idle, deleting, failed }
    public init(model: AppModel) { self.model = model }
    private let deleted = ["Your profile: birth year, school, district code, bus number, student ID and your usual bus times.",
                           "Everything saved on this phone: children you follow, past rides, alert settings and preferences.",
                           "Your agreement to the Terms. You will be asked again if you come back."]
    private let stays = ["Location points are never linked to your account, so they cannot be found or deleted by account. They are already deleted when a trip ends, and always within 6 hours.",
                         "Reports you sent (\"Bus didn't come\" or \"Bus came early\") and anonymous bus timing data cannot be traced to you, so they stay."]
    private let before = ["If you are on a trip right now, it will end.", "This cannot be undone. To use GoNC again you will need to set up from the start."]
    private func list(_ title: String, _ items: [String], _ icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.system(size: 14, weight: .heavy)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
            ForEach(items, id: \.self) { t in HStack(alignment: .top, spacing: 10) { Image(systemName: icon).foregroundStyle(GN.sub).padding(.top, 2); Text(t).font(.system(size: 14)).foregroundStyle(GN.ink) } }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    public var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                VStack(spacing: 10) {
                    Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 26)).foregroundStyle(GN.danger).frame(width: 56, height: 56).background(GN.cardAlt, in: Circle())
                    Text("Delete your account?").font(.system(size: 22, weight: .heavy)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
                    Text("Please read this first. Deleting is permanent.").font(.system(size: 14)).foregroundStyle(GN.sub)
                }
                list("What will be deleted", deleted, "trash"); list("What stays", stays, "checkmark.shield"); list("Before you go", before, "exclamationmark.circle")
                Button { if phase != .deleting { checked.toggle() } } label: {
                    HStack(spacing: 12) {
                        Image(systemName: checked ? "checkmark.square.fill" : "square").font(.system(size: 24)).foregroundStyle(checked ? GN.brand : GN.sub)
                        Text("I understand this cannot be undone.").font(.system(size: 14)).foregroundStyle(GN.ink); Spacer()
                    }.padding(14).background(GN.cardAlt, in: RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain).accessibilityLabel("I understand this cannot be undone").accessibilityAddTraits(checked ? [.isSelected] : [])
                if phase == .failed { Text("Couldn't delete your account. Check your connection and try again. Nothing was deleted.").font(.system(size: 14)).foregroundStyle(GN.danger).multilineTextAlignment(.center) }
                GNButton(phase == .deleting ? "Deleting…" : phase == .failed ? "Try again" : "Delete everything", icon: "trash", kind: .danger) {
                    phase = .deleting
                    Task { if await model.deleteAccount() { dismiss() } else { phase = .failed } }
                }.disabled(!checked || phase == .deleting)
                GNButton("Keep my account") { dismiss() }.disabled(phase == .deleting)
            }
            .padding(20)
        }
        .background(GN.bg).interactiveDismissDisabled(phase == .deleting)
    }
}

/// Rides are saved on this phone only (the server holds no per-person trip list). No location points are kept for any of them.
public struct PastRidesView: View {
    @Bindable var model: AppModel
    public init(model: AppModel) { self.model = model }
    public var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Past rides").font(.system(size: 24, weight: .heavy)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
            if model.rides.isEmpty {
                VStack(spacing: 10) {
                    IconBubble("bus.fill", size: 56)
                    Text("No rides yet").font(.system(size: 16, weight: .bold)).foregroundStyle(GN.ink)
                    Text("Your trips show up here after you end one.").font(.system(size: 14)).foregroundStyle(GN.sub).multilineTextAlignment(.center)
                }.frame(maxWidth: .infinity).padding(.vertical, 40)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(model.rides.enumerated()), id: \.element.id) { i, r in
                        HStack(spacing: 14) {
                            IconBubble(r.published == true ? "checkmark.circle.fill" : "bus.fill", size: 40)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(r.title()).font(.system(size: 15, weight: .bold)).foregroundStyle(GN.ink)
                                Text("Bus \(r.bus) · \(r.durationMin) min").font(.system(size: 13)).foregroundStyle(GN.sub)
                                Text(r.outcomeText).font(.system(size: 13)).foregroundStyle(GN.sub)
                            }
                            Spacer()
                            Label("0 points kept", systemImage: "checkmark.shield.fill").font(.system(size: 11, weight: .semibold)).foregroundStyle(GN.sub).labelStyle(.titleAndIcon)
                        }
                        .padding(.vertical, 14).padding(.horizontal, 16).accessibilityElement(children: .combine)
                        if i < model.rides.count - 1 { Divider().overlay(GN.line) }
                    }
                }
                .background(GN.card, in: RoundedRectangle(cornerRadius: 16)).overlay(RoundedRectangle(cornerRadius: 16).stroke(GN.line))
                GNButton("Clear history") { model.clearRides() }
            }
        }
        .padding(20)
    }
}
