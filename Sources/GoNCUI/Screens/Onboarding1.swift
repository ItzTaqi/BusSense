import SwiftUI
import GoNCCore

/// First screen: the name and the tagline, centered, plus the one button needed to continue.
public struct WelcomeView: View {
    let onStart: () -> Void
    public init(onStart: @escaping () -> Void) { self.onStart = onStart }
    public var body: some View {
        ZStack {
            GN.heroGradient.ignoresSafeArea()
            VStack {
                Spacer()
                Text("GoNC").font(GNFont.jakarta(64, .heavy)).tracking(-2.5).foregroundStyle(.white).accessibilityAddTraits(.isHeader)
                Text("Powered by riders · Just for riders").font(GNFont.jakarta(14, .heavy)).tracking(0.3)
                    .foregroundStyle(Color(hex: 0x061A66)).padding(.vertical, 8).padding(.horizontal, 18).background(.white, in: Capsule()).padding(.top, 18)
                Spacer()
                Button(action: onStart) {
                    HStack(spacing: 8) { Text("Get started"); Image(systemName: "arrow.right") }
                        .font(GNFont.jakarta(16, .heavy)).foregroundStyle(Color(hex: 0x061A66)).frame(maxWidth: .infinity, minHeight: 52).background(.white, in: RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain).accessibilityLabel("Get started")
            }
            .padding(24)
        }
    }
}

/// The full Privacy and Terms, shared by Settings and the agreement screen.
public struct TermsContentView: View {
    public init() {}
    public var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 6) {
                Text(TermsText.title).font(.system(size: 26, weight: .heavy)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
                Text(TermsText.updated).font(.system(size: 13)).foregroundStyle(GN.sub)
            }
            Text(TermsText.intro).font(.system(size: 15)).foregroundStyle(GN.sub)
            ForEach(Array(TermsText.sections.enumerated()), id: \.offset) { i, s in
                VStack(alignment: .leading, spacing: 8) {
                    Text("\(i + 1). \(s.title)").font(.system(size: 17, weight: .heavy)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
                    ForEach(s.body, id: \.self) { Text($0).font(.system(size: 15)).lineSpacing(4).foregroundStyle(GN.ink) }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Shown after "Get started". The person reads the terms, ticks the box, and only then can continue.
public struct TermsAgreementView: View {
    let onAgree: () -> Void; var onBack: (() -> Void)? = nil
    @State private var checked = false
    public init(onAgree: @escaping () -> Void, onBack: (() -> Void)? = nil) { self.onAgree = onAgree; self.onBack = onBack }
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if let onBack { Button(action: onBack) { Label("Back", systemImage: "chevron.left").font(.system(size: 16, weight: .bold)).foregroundStyle(GN.brand) }.buttonStyle(.plain).accessibilityLabel("Back") }
                TermsContentView()
                VStack(spacing: 14) {
                    Button { checked.toggle() } label: {
                        HStack(spacing: 12) {
                            Image(systemName: checked ? "checkmark.square.fill" : "square").font(.system(size: 24)).foregroundStyle(checked ? GN.brand : GN.sub)
                            Text("I have read and agree to the Privacy and Terms.").font(.system(size: 15)).foregroundStyle(GN.ink).multilineTextAlignment(.leading)
                            Spacer()
                        }
                        .padding(14).background(GN.cardAlt, in: RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain).accessibilityAddTraits(checked ? [.isSelected] : []).accessibilityLabel("I have read and agree to the Privacy and Terms")
                    GNButton("Agree and continue", kind: .primary, action: onAgree).disabled(!checked)
                }
            }
            .padding(22)
        }
        .background(GN.bg)
    }
}

/// Who is using the app. The answer decides which screens the person sees.
public struct RoleSelectView: View {
    let onRider: () -> Void, onParent: () -> Void, onBack: () -> Void
    public init(onRider: @escaping () -> Void, onParent: @escaping () -> Void, onBack: @escaping () -> Void) { self.onRider = onRider; self.onParent = onParent; self.onBack = onBack }
    private func option(_ icon: String, _ title: String, _ sub: String, solid: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 28))
                Text(title).font(.system(size: 18, weight: .heavy))
                Text(sub).font(.system(size: 13)).multilineTextAlignment(.center).opacity(0.85)
            }
            .foregroundStyle(solid ? GN.onBrand : GN.ink).frame(maxWidth: .infinity).padding(18)
            .background(solid ? GN.brand : GN.cardAlt, in: RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain).accessibilityElement(children: .combine)
    }
    public var body: some View {
        VStack(spacing: 14) {
            Spacer()
            Text("Who is using GoNC?").font(.system(size: 24, weight: .heavy)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader)
            Text("You will only see what is useful for you.").font(.system(size: 14)).foregroundStyle(GN.sub)
            option("bus.fill", "I ride the bus", "Share your bus so others can see it. Ages 13+.", solid: true, onRider)
            option("person.2.fill", "I'm a parent", "Follow your child's bus to your stop.", solid: false, onParent)
            Button("Back", action: onBack).font(.system(size: 15, weight: .bold)).foregroundStyle(GN.brand).buttonStyle(.plain).frame(minHeight: 44)
            Spacer()
        }
        .padding(24).background(GN.bg)
    }
}
