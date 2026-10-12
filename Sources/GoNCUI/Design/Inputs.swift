import SwiftUI
import GoNCCore

/// Dropdown for students: tap, search or scroll, tap again. Optional "not listed" escape hatch.
public struct SelectField: View {
    let label: String
    var placeholder: String? = nil
    let options: [String]
    @Binding var selection: String
    var disabled = false
    var otherLabel: String? = nil
    var onOther: (() -> Void)? = nil
    @State private var open = false
    @State private var query = ""

    public init(_ label: String, placeholder: String? = nil, options: [String], selection: Binding<String>, disabled: Bool = false, otherLabel: String? = nil, onOther: (() -> Void)? = nil) {
        self.label = label; self.placeholder = placeholder; self.options = options; _selection = selection; self.disabled = disabled; self.otherLabel = otherLabel; self.onOther = onOther
    }
    private var shown: [String] { query.isEmpty ? options : options.filter { $0.localizedCaseInsensitiveContains(query) } }

    public var body: some View {
        Button { open = true } label: {
            HStack {
                Text(selection.isEmpty ? (placeholder ?? label) : selection).lineLimit(1)
                    .foregroundStyle(selection.isEmpty ? GN.sub : GN.ink).frame(maxWidth: .infinity)
                Image(systemName: "chevron.down").font(.system(size: 13, weight: .semibold)).foregroundStyle(GN.sub)
            }
            .fieldBox(focused: open)
        }
        .buttonStyle(.plain).disabled(disabled).opacity(disabled ? 0.5 : 1)
        .accessibilityLabel("\(label): \(selection.isEmpty ? "not chosen" : selection)")
        .sheet(isPresented: $open, onDismiss: { query = "" }) {
            NavigationStack {
                VStack(spacing: 12) {
                    TextField("", text: $query, prompt: Text("Search").foregroundStyle(GN.sub)).textFieldStyle(.plain).fieldBox().padding(.horizontal, 16)
                        .accessibilityLabel("Search \(label)")
                    List {
                        ForEach(shown, id: \.self) { o in
                            Button { selection = o; open = false } label: {
                                HStack { Text(o).foregroundStyle(o == selection ? GN.brand : GN.ink).fontWeight(o == selection ? .bold : .regular); Spacer() }
                            }
                        }
                        if shown.isEmpty { Text("No matches.").foregroundStyle(GN.sub).frame(maxWidth: .infinity) }
                        if let otherLabel, let onOther {
                            Button { open = false; onOther() } label: { Text(otherLabel).foregroundStyle(GN.brand).fontWeight(.semibold) }
                        }
                    }
                    .listStyle(.plain)
                }
                .padding(.top, 12).background(GN.bg)
                .navigationTitle(label)
                #if os(iOS)
                .navigationBarTitleDisplayMode(.inline)
                #endif
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Close") { open = false } } }
            }
            .presentationDetents([.large])
        }
    }
}

/// Birthday field: tap it for a pop-out calendar (the system graphical date picker, which can jump by month and year).
public struct BirthdayField: View {
    @Binding var value: YMD?
    @State private var open = false
    @State private var draft = Calendar.current.date(byAdding: .year, value: -14, to: Date())!
    public init(value: Binding<YMD?>) { _value = value }
    public var body: some View {
        Button { open = true } label: {
            HStack(spacing: 10) {
                Image(systemName: "calendar").foregroundStyle(GN.brand)
                Text(value?.formatted ?? "MM/DD/YYYY").font(.system(size: 17, weight: .semibold)).foregroundStyle(value == nil ? GN.sub : GN.ink)
            }
            .frame(maxWidth: .infinity).fieldBox(focused: open)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Birthday: \(value?.formatted ?? "not chosen"). Opens calendar")
        .sheet(isPresented: $open) {
            VStack(spacing: 8) {
                DatePicker("Birthday", selection: $draft, in: ...Date(), displayedComponents: .date).datePickerStyle(.graphical).tint(GN.brand).padding(.horizontal, 12)
                GNButton("Done", kind: .primary) {
                    let c = Calendar.current.dateComponents([.year, .month, .day], from: draft)
                    value = YMD(y: c.year!, m: c.month!, d: c.day!); open = false
                }.padding(.horizontal, 16)
            }
            .padding(.vertical, 16).background(GN.bg).presentationDetents([.medium, .large])
        }
    }
}

/// One quiet button. Tap it and it opens into the two choices. Sending closes it again with a short thank-you.
public struct ReportButton: View {
    enum Phase { case idle, sending, sent, failed }
    let send: (Report.Kind) async -> Bool
    @State private var open = false
    @State private var phase: [Report.Kind: Phase] = [.noShow: .idle, .early: .idle]
    public init(send: @escaping (Report.Kind) async -> Bool) { self.send = send }
    private var anySent: Bool { phase.values.contains(.sent) }

    private func label(_ kind: Report.Kind, _ idle: String) -> String {
        switch phase[kind] ?? .idle { case .sending: return "Sending…"; case .failed: return "Couldn't send. Tap to retry"; default: return idle }
    }
    private func tap(_ kind: Report.Kind) {
        guard phase[kind] == .idle || phase[kind] == .failed else { return }
        phase[kind] = .sending
        Task {
            let ok = await send(kind)
            phase[kind] = ok ? .sent : .failed
            if ok {
                withAnimation { open = false }
                try? await Task.sleep(nanoseconds: 60_000_000_000)      // each choice locks for a minute to prevent double reports
                phase[kind] = .idle
            }
        }
    }
    public var body: some View {
        VStack(spacing: 10) {
            Button { withAnimation(.easeInOut(duration: 0.2)) { open.toggle() } } label: {
                HStack {
                    Image(systemName: anySent ? "checkmark.circle.fill" : "flag.fill").foregroundStyle(GN.brand)
                    Text(anySent ? "Thanks, report sent" : "Report a problem").font(.system(size: 16, weight: .bold)).foregroundStyle(GN.ink)
                    Spacer()
                    Image(systemName: open ? "chevron.up" : "chevron.down").foregroundStyle(GN.sub)
                }
                .padding(.horizontal, 16).frame(minHeight: 50).background(GN.cardAlt, in: RoundedRectangle(cornerRadius: GN.radius - 2))
            }
            .buttonStyle(.plain).accessibilityLabel("Report a problem").accessibilityValue(open ? "expanded" : "collapsed")
            if open {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 8) { choices }
                    VStack(spacing: 8) { choices }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
            Text(anySent ? "Reports are anonymous and help other families." : open ? "Reports are anonymous." : " ")
                .font(.system(size: 12)).foregroundStyle(GN.sub)
        }
    }
    @ViewBuilder private var choices: some View {
        GNButton(label(.noShow, "Bus didn't come"), icon: "xmark.circle.fill", kind: .danger) { tap(.noShow) }.disabled(phase[.noShow] == .sending || phase[.noShow] == .sent)
        GNButton(label(.early, "Bus came early"), icon: "bolt.fill") { tap(.early) }.disabled(phase[.early] == .sending || phase[.early] == .sent)
    }
}
