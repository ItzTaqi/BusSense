import SwiftUI
import GoNCCore

/// The whole app. Drop `GoNCRootView()` into any iOS app target (see README) and it runs.
@MainActor public struct GoNCRootView: View {
    @State private var model: AppModel
    public init(model: AppModel? = nil) { _model = State(initialValue: model ?? AppModel()) }

    public var body: some View {
        content
            .buttonStyle(.plain).tint(GN.brand)
            .preferredColorScheme(model.appearance.colorScheme)
            .background(GN.bg.ignoresSafeArea())
            .task { GNFont.register(); await model.load() }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Image(systemName: "bus.fill").font(.system(size: 13)).foregroundStyle(Color(hex: 0x061A66)).frame(width: 26, height: 26).background(.white, in: RoundedRectangle(cornerRadius: 8))
            Text("GoNC").font(.system(size: 17, weight: .heavy)).foregroundStyle(.white).accessibilityAddTraits(.isHeader)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 8).background(GN.heroA.ignoresSafeArea(edges: .top))
    }

    @ViewBuilder private var content: some View {
        if model.mode == nil && model.stage == .welcome && !model.demo {
            WelcomeView { model.stage = model.termsAccepted ? .role : .terms }
        } else {
            VStack(spacing: 0) {
                header
                if model.demo { demoBar }
                screen
            }
        }
    }

    private var demoBar: some View {
        HStack {
            Text("Demo · sample data, not real").font(.system(size: 13, weight: .bold)).foregroundStyle(GN.ink)
            Spacer()
            Button("Exit demo") { model.demo = false }.font(.system(size: 14, weight: .heavy)).foregroundStyle(GN.brand).buttonStyle(.plain).accessibilityLabel("Exit demo")
        }
        .padding(.horizontal, 16).padding(.vertical, 8).background(GN.cardAlt)
    }

    @ViewBuilder private var screen: some View {
        if model.mustAgreeFirst { TermsAgreementView(onAgree: { model.agreeToTerms() }) }
        else if model.addingChild { ParentSetupView(model: model, adding: true) }
        else if model.demo { ParentTodayView(model: model) }
        else if model.mode == nil {
            switch model.stage {
            case .terms: TermsAgreementView(onAgree: { model.agreeToTerms(); model.stage = .role }, onBack: { model.stage = .welcome })
            case .role: RoleSelectView(onRider: { model.stage = .riderSetup }, onParent: { model.stage = .parentSetup }, onBack: { model.stage = .welcome })
            case .riderSetup: RiderSetupView(model: model)
            case .parentSetup: ParentSetupView(model: model)
            case .welcome: EmptyView()
            }
        } else { tabs }
    }

    private var tabs: some View {
        TabView(selection: $model.tab) {
            Group {
                if model.mode == .parent { ParentTodayView(model: model) } else { RiderHomeView(model: model) }
            }
            .tabItem { Label(model.mode == .parent ? "Today" : "Ride", systemImage: model.mode == .parent ? "house.fill" : "bus.fill") }.tag(AppTab.home)
            if model.mode == .parent {
                WeeklyReportView(model: model).tabItem { Label("Weekly report", systemImage: "chart.bar.fill") }.tag(AppTab.report)
            }
            SettingsView(model: model).tabItem { Label("Settings", systemImage: "gearshape.fill") }.tag(AppTab.settings)
        }
        .tint(GN.brand)
    }
}
