import SwiftUI
import GoNCCore

// MARK: Buttons

public struct GNButtonStyle: ButtonStyle {
    public enum Kind { case primary, soft, danger }
    var kind: Kind
    @Environment(\.isEnabled) private var enabled
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(kind == .primary ? GN.onBrand : kind == .danger ? GN.danger : GN.ink)
            .frame(maxWidth: .infinity, minHeight: 50)
            .padding(.horizontal, 16)
            .background(kind == .primary ? GN.brand : GN.cardAlt, in: RoundedRectangle(cornerRadius: GN.radius - 2))
            .opacity(enabled ? 1 : 0.4)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
public extension ButtonStyle where Self == GNButtonStyle {
    static var gnPrimary: GNButtonStyle { .init(kind: .primary) }
    static var gnSoft: GNButtonStyle { .init(kind: .soft) }
    static var gnDanger: GNButtonStyle { .init(kind: .danger) }
}

/// Button with an optional SF Symbol, in one of the three kinds.
public struct GNButton: View {
    let title: String; var icon: String? = nil; var kind: GNButtonStyle.Kind = .soft; let action: () -> Void
    public init(_ title: String, icon: String? = nil, kind: GNButtonStyle.Kind = .soft, action: @escaping () -> Void) { self.title = title; self.icon = icon; self.kind = kind; self.action = action }
    public var body: some View {
        Button(action: action) {
            HStack(spacing: 8) { if let icon { Image(systemName: icon) }; Text(title) }
        }
        .buttonStyle(GNButtonStyle(kind: kind))
        .accessibilityLabel(title)
    }
}

// MARK: Fields

/// Shared look for every text field: soft filled box, no hard outline, blue ring while focused.
struct FieldBox: ViewModifier {
    var focused = false
    func body(content: Content) -> some View {
        content
            .font(.system(size: 16))
            .foregroundStyle(GN.ink)
            .padding(.horizontal, 16)
            .frame(minHeight: 48)
            .background(GN.cardAlt, in: RoundedRectangle(cornerRadius: GN.radius - 2))
            .overlay(RoundedRectangle(cornerRadius: GN.radius - 2).stroke(focused ? GN.brand : .clear, lineWidth: 1.5))
    }
}
extension View { func fieldBox(focused: Bool = false) -> some View { modifier(FieldBox(focused: focused)) } }

public struct GNTextField: View {
    let placeholder: String; @Binding var text: String; var maxLength: Int? = nil; var numeric = false
    @FocusState private var focused: Bool
    public init(_ placeholder: String, text: Binding<String>, maxLength: Int? = nil, numeric: Bool = false) { self.placeholder = placeholder; _text = text; self.maxLength = maxLength; self.numeric = numeric }
    public var body: some View {
        TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(GN.sub))
            .textFieldStyle(.plain)
            .multilineTextAlignment(.center)
            .focused($focused)
            #if os(iOS)
            .keyboardType(numeric ? .numberPad : .default)
            #endif
            .fieldBox(focused: focused)
            .onChange(of: text) { _, new in if let m = maxLength, new.count > m { text = String(new.prefix(m)) } }
            .accessibilityLabel(placeholder)
    }
}

// MARK: Cards, badges, hero

public struct GNCard<Content: View>: View {
    var title: String? = nil; var icon: String? = nil; @ViewBuilder var content: () -> Content
    public init(title: String? = nil, icon: String? = nil, @ViewBuilder content: @escaping () -> Content) { self.title = title; self.icon = icon; self.content = content }
    public var body: some View {
        VStack(spacing: 10) {
            if title != nil || icon != nil {
                HStack(spacing: 8) {
                    if let icon { IconBubble(icon) }
                    if let title { Text(title).font(.system(size: 16, weight: .bold)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader) }
                }
            }
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(GN.card, in: RoundedRectangle(cornerRadius: GN.radius + 2))
        .overlay(RoundedRectangle(cornerRadius: GN.radius + 2).stroke(GN.line, lineWidth: 1))
    }
}

public struct IconBubble: View {
    let name: String; var size: CGFloat = 36; var bg: Color = GN.cardAlt
    public init(_ name: String, size: CGFloat = 36, bg: Color = GN.cardAlt) { self.name = name; self.size = size; self.bg = bg }
    public var body: some View {
        Image(systemName: name).font(.system(size: size * 0.46, weight: .semibold)).foregroundStyle(GN.brand)
            .frame(width: size, height: size).background(bg, in: Circle()).accessibilityHidden(true)
    }
}

/// Pulsing dot for LIVE. Respects the system "Reduce Motion" setting.
public struct PulseDot: View {
    var color: Color
    @Environment(\.accessibilityReduceMotion) private var reduce
    @State private var pulse = false
    public init(color: Color) { self.color = color }
    public var body: some View {
        ZStack {
            if !reduce { Circle().fill(color.opacity(pulse ? 0 : 0.6)).frame(width: 14, height: 14).scaleEffect(pulse ? 2.4 : 1) }
            Circle().fill(color).frame(width: 8, height: 8)
        }
        .frame(width: 14, height: 14)
        .onAppear { if !reduce { withAnimation(.easeOut(duration: 1.4).repeatForever(autoreverses: false)) { pulse = true } } }
        .accessibilityHidden(true)
    }
}

/// Source badge: icon + TEXT + fill style (solid / outline / dashed / faint). Never color alone.
public struct SourceBadge: View {
    let source: BusSource; var onDark = true
    public init(_ source: BusSource, onDark: Bool = true) { self.source = source; self.onDark = onDark }
    private var solid: Color { onDark ? .white : GN.brand }
    private var inverse: Color { onDark ? Color(hex: 0x061A66) : .white }
    public var body: some View {
        let (fg, bg, border, dash, icon): (Color, Color, Color, Bool, String) = {
            switch source {
            case .live: return (inverse, solid, solid, false, "dot.radiowaves.left.and.right")
            case .recent: return (solid, .clear, solid, false, "clock")
            case .estimate: return (solid, .clear, solid, true, "chart.line.uptrend.xyaxis")
            case .noData: return (solid, onDark ? .white.opacity(0.16) : GN.cardAlt, .clear, false, "questionmark.circle")
            }
        }()
        HStack(spacing: 6) {
            if source == .live { PulseDot(color: fg) } else { Image(systemName: icon).font(.system(size: 13, weight: .semibold)) }
            Text(source.label).font(.system(size: 13, weight: .bold)).tracking(0.8)
        }
        .foregroundStyle(fg)
        .padding(.vertical, 6).padding(.horizontal, 12)
        .background(bg, in: Capsule())
        .overlay(Capsule().strokeBorder(border, style: StrokeStyle(lineWidth: 1.5, dash: dash ? [4, 3] : [])))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Data source: \(source.label)")
    }
}

public struct Hero<Content: View>: View {
    @ViewBuilder var content: () -> Content
    public init(@ViewBuilder content: @escaping () -> Content) { self.content = content }
    public var body: some View {
        VStack(spacing: 10) { content() }
            .padding(24).frame(maxWidth: .infinity)
            .background(GN.heroGradient, in: RoundedRectangle(cornerRadius: GN.radius + 10))
    }
}

public struct ProgressSteps: View {
    let step: Int; let total: Int
    public init(step: Int, total: Int) { self.step = step; self.total = total }
    public var body: some View {
        HStack(spacing: 6) { ForEach(0..<total, id: \.self) { Capsule().fill($0 < step ? GN.brand : GN.line).frame(height: 4) } }
            .accessibilityElement(children: .ignore).accessibilityLabel("Step \(step) of \(total)")
    }
}

/// A line of stops on a dark hero: the bus marker sits `stopsAway` dots before "your stop".
public struct RouteTrack: View {
    let stopsAway: Int?
    public init(stopsAway: Int?) { self.stopsAway = stopsAway }
    public var body: some View {
        if let away = stopsAway {
            let n = min(away, 6) + 1
            VStack(spacing: 8) {
                HStack(spacing: 0) {
                    ForEach(0..<n, id: \.self) { i in
                        let last = i == n - 1
                        if i == 0 { Image(systemName: "bus.fill").font(.system(size: 14)).foregroundStyle(Color(hex: 0x0B3FBF)).frame(width: 30, height: 30).background(.white, in: Circle()) }
                        else if last { Image(systemName: "house.fill").font(.system(size: 13)).foregroundStyle(.white).frame(width: 30, height: 30).overlay(Circle().stroke(.white, lineWidth: 2)) }
                        else { Circle().fill(.white.opacity(0.78)).frame(width: 12, height: 12) }
                        if !last { Capsule().fill(i == 0 ? .white : .white.opacity(0.22)).frame(height: 4).padding(.horizontal, 4) }
                    }
                }
                Text(away == 0 ? "Your stop is next" : "\(away) stop\(away == 1 ? "" : "s") away")
                    .font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.78))
            }
            .accessibilityElement(children: .ignore).accessibilityLabel("The bus is \(away) stops away from your stop")
        }
    }
}

public struct ScreenTitle: View {
    let text: String
    public init(_ text: String) { self.text = text }
    public var body: some View { Text(text).font(.system(size: 22, weight: .bold)).foregroundStyle(GN.ink).accessibilityAddTraits(.isHeader) }
}
