import SwiftUI
import GoNCCore

/// Weekly insights come from anonymous parent reports. The AI report is written on the server from the same counts.
public struct WeeklyReportView: View {
    @Bindable var model: AppModel
    @State private var reports: [Report] = []
    @State private var loaded = false
    @State private var failed = false
    @State private var summary: String?
    @State private var weekLabel = Weekly.options()[0].label
    public init(model: AppModel) { self.model = model }
    private let weeks = Weekly.options()

    public var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                ScreenTitle("Weekly report")
                Text("Bus \(model.child?.bus ?? "–") · last 4 weeks").font(.system(size: 16)).foregroundStyle(GN.sub)
                GNCard(title: "Weekly insights", icon: "chart.bar.fill") {
                    if failed { Text("Couldn't load reports. Try again later.").foregroundStyle(GN.sub).font(.system(size: 15)) }
                    else if !loaded { Text("Loading…").foregroundStyle(GN.sub) }
                    else { insightsBody(Insights.compute(reports)) }
                }
                if loaded && !failed { weekByWeek }
                GNCard(title: "AI report", icon: "sparkles") {
                    Text("Written on the server from the report counts only. No names, locations or IDs are used.").font(.system(size: 12)).foregroundStyle(GN.sub).multilineTextAlignment(.center)
                    if let summary { Text(summary).font(.system(size: 15)).foregroundStyle(GN.ink) }
                    else { Text("This week's AI report isn't ready yet.").font(.system(size: 15)).foregroundStyle(GN.sub) }
                }
            }
            .padding(16)
        }
        .background(GN.bg)
        .task(id: model.child?.id) { await load() }
    }

    private func insightsBody(_ i: Insights) -> some View {
        VStack(spacing: 12) {
            HStack {
                stat("Didn't come", i.totalNoShow); stat("Came early", i.totalEarly); stat("This week", i.thisWeek)
            }
            Divider().overlay(GN.line)
            let mx = max(1, i.series.max() ?? 1)
            HStack(alignment: .bottom, spacing: 10) {
                ForEach(Array(i.series.enumerated()), id: \.offset) { n, v in
                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 6).fill(n == i.series.count - 1 ? GN.brand : GN.line).frame(width: 22, height: 6 + 44 * CGFloat(v) / CGFloat(mx))
                        Text(n == i.series.count - 1 ? "Now" : "-\(i.series.count - 1 - n)w").font(.system(size: 11)).foregroundStyle(GN.sub)
                    }.frame(width: 34)
                }
            }
            .frame(height: 70).accessibilityElement(children: .ignore).accessibilityLabel("Didn't-come reports per week: \(i.series.map(String.init).joined(separator: ", "))")
            Divider().overlay(GN.line)
            Text(i.trendText + (i.worstDay.map { " · most reports on \($0)s" } ?? "")).font(.system(size: 16)).foregroundStyle(GN.ink).multilineTextAlignment(.center)
        }
    }
    private func stat(_ label: String, _ n: Int) -> some View {
        VStack(spacing: 2) { Text("\(n)").font(.system(size: 26, weight: .heavy)).foregroundStyle(GN.ink); Text(label).font(.system(size: 12, weight: .semibold)).foregroundStyle(GN.sub) }.frame(maxWidth: .infinity)
    }

    private var weekByWeek: some View {
        let week = weeks.first { $0.label == weekLabel } ?? weeks[0]
        let days = Weekly.daily(reports, weekStart: week.start)
        let tot = Weekly.totals(days)
        return GNCard(title: "Week by week", icon: "calendar") {
            SelectField("Week", options: weeks.map(\.label), selection: $weekLabel)
            Text(tot.noShow + tot.early == 0 ? "No reports this week" : "\(tot.noShow) didn't come · \(tot.early) came early").font(.system(size: 14, weight: .semibold)).foregroundStyle(GN.ink)
            VStack(spacing: 0) {
                ForEach(Array(days.enumerated()), id: \.element.id) { i, d in
                    HStack {
                        Text(d.label).font(.system(size: 15, weight: .semibold)).foregroundStyle(GN.ink)
                        Spacer()
                        if d.noShow + d.early == 0 { Text("No reports").font(.system(size: 13)).foregroundStyle(GN.sub) }
                        else {
                            HStack(spacing: 8) {
                                if d.noShow > 0 { Text("Didn't come ×\(d.noShow)").foregroundStyle(GN.danger) }
                                if d.early > 0 { Text("Early ×\(d.early)").foregroundStyle(GN.brand) }
                            }.font(.system(size: 13, weight: .bold))
                        }
                    }
                    .padding(.vertical, 12).padding(.horizontal, 14).accessibilityElement(children: .combine)
                    if i < days.count - 1 { Divider().overlay(GN.line) }
                }
            }
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(GN.line, lineWidth: 1))
            Text("Based on parent reports only. A day with no reports isn't proof the bus was on time.").font(.system(size: 12)).foregroundStyle(GN.sub).multilineTextAlignment(.center)
        }
    }

    private func load() async {
        loaded = false; failed = false
        guard let c = model.child else { return }
        if model.demo { reports = []; loaded = true; return }
        do { reports = try await model.backend.routeReports(route: c.bus, weeks: 8); summary = try? await model.backend.weeklySummary(route: c.bus) }
        catch { failed = true }
        loaded = true
    }
}
