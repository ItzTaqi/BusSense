import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SelectField } from "../components/SelectField";
import { Btn, Card, H, P, Screen } from "../components/Ui";
import { Insights, Report, computeInsights, trendText } from "../lib/insights";
import { supabase } from "../lib/supabase";
import { dailyBreakdown, weekOptions, weekTotals } from "../lib/weekly";
import { useTheme } from "../theme";

// Weekly insights come from anonymous parent reports. The AI summary only ever receives the counts below.
export function WeeklyReport({ route }: { route: string }) {
  const c = useTheme();
  const [ins, setIns] = useState<Insights | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const weeks = weekOptions();
  const [weekLabel, setWeekLabel] = useState(weeks[0].label);
  const [loadErr, setLoadErr] = useState(false);
  const [ai, setAi] = useState<{ state: "idle" | "loading" | "done" | "off" | "error"; text?: string }>({ state: "idle" });

  useEffect(() => {
    if (!route) return;
    supabase.functions.invoke(`route-report/${encodeURIComponent(route)}/report?weeks=8`, { method: "GET" })
      .then(({ data, error }) => {
        if (error || !data) { setLoadErr(true); return; }
        const list = (data.reports ?? []) as Report[];
        setReports(list);
        setIns(computeInsights(list, 4));
      });
  }, [route]);

  const summarize = async () => {
    if (!ins) return;
    setAi({ state: "loading" });
    const { data, error } = await supabase.functions.invoke("weekly-summary", { body: ins });
    if (error || !data?.summary) {
      const notConfigured = (error as { context?: { status?: number } } | null)?.context?.status === 501;
      setAi({ state: notConfigured ? "off" : "error" });
    } else setAi({ state: "done", text: data.summary });
  };

  const stat = (label: string, value: string) => (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: c.ink }}>{value}</Text>
      <Text style={{ fontSize: 12, fontWeight: "600", color: c.sub, textAlign: "center" }}>{label}</Text>
    </View>
  );
  const max = Math.max(1, ...(ins?.series ?? [0]));

  return (
    <Screen>
      <H>Weekly report</H>
      <P dim>Bus {route || "–"} · last 4 weeks</P>
      <Card title="Weekly insights" icon="stats-chart">
        {loadErr ? <P dim>Couldn't load reports. Try again later.</P> : !ins ? <P dim>Loading…</P> : (<>
          <View style={{ flexDirection: "row" }}>
            {stat("Didn't come", String(ins.totalNoShow))}
            {stat("Came early", String(ins.totalEarly))}
            {stat("This week", String(ins.thisWeek))}
          </View>
          <View style={{ height: 1, backgroundColor: c.line }} />
          <View accessible accessibilityLabel={`Didn't-come reports per week: ${ins.series.join(", ")}`} style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 10, height: 70 }}>
            {ins.series.map((n, i) => (
              <View key={i} style={{ width: 34, alignItems: "center", gap: 4 }}>
                <View style={{ width: 22, height: 6 + (n / max) * 44, borderRadius: 6, backgroundColor: i === ins.series.length - 1 ? c.primary : c.line }} />
                <Text style={{ fontSize: 11, color: c.sub }}>{i === ins.series.length - 1 ? "Now" : `-${ins.series.length - 1 - i}w`}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 1, backgroundColor: c.line }} />
          <P>{trendText(ins)}{ins.worstDay ? ` · most reports on ${ins.worstDay}s` : ""}</P>
        </>)}
      </Card>
      {ins && (() => {
        const week = weeks.find((w) => w.label === weekLabel) ?? weeks[0];
        const days = dailyBreakdown(reports, week.start);
        const tot = weekTotals(days);
        return (
          <Card title="Week by week" icon="calendar">
            <SelectField label="Week" value={weekLabel} options={weeks.map((w) => w.label)} onSelect={setWeekLabel} />
            <Text accessibilityLiveRegion="polite" style={{ fontSize: 14, textAlign: "center", color: c.ink, fontWeight: "600" }}>
              {tot.noShow + tot.early === 0 ? "No reports this week" : `${tot.noShow} didn't come · ${tot.early} came early`}
            </Text>
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: c.line }}>
              {days.map((d, i) => (
                <View key={d.key} accessible accessibilityLabel={`${d.label}: ${d.noShow} didn't come, ${d.early} came early`}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.line }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{d.label}</Text>
                  {d.noShow + d.early === 0 ? (
                    <Text style={{ fontSize: 13, color: c.sub }}>No reports</Text>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {d.noShow > 0 && <Text style={{ fontSize: 13, fontWeight: "700", color: c.danger }}>Didn't come ×{d.noShow}</Text>}
                      {d.early > 0 && <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>Early ×{d.early}</Text>}
                    </View>
                  )}
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, textAlign: "center", color: c.sub }}>Based on parent reports only. A day with no reports isn't proof the bus was on time.</Text>
          </Card>
        );
      })()}
      <Card title="AI report" icon="sparkles">
        <Text style={{ fontSize: 12, textAlign: "center", color: c.sub }}>AI-generated from the counts above only. No names, locations or IDs are shared.</Text>
        {ai.state === "done" && <P>{ai.text}</P>}
        {ai.state === "off" && <P dim>AI reports aren't switched on yet.</P>}
        {ai.state === "error" && <P dim>Couldn't write the report. Try again.</P>}
        <Btn primary icon="sparkles" label={ai.state === "loading" ? "Writing…" : ai.state === "done" ? "Write it again" : "Write AI report"}
          disabled={!ins || ai.state === "loading" || ins.totalNoShow + ins.totalEarly === 0} onPress={summarize} />
        {ins && ins.totalNoShow + ins.totalEarly === 0 && <Text style={{ fontSize: 12, textAlign: "center", color: c.sub }}>Needs at least one report first.</Text>}
      </Card>
    </Screen>
  );
}
