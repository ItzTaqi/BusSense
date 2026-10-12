import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Btn, Card, H, P, Screen } from "../components/Ui";
import { Insights, Report, computeInsights, trendText } from "../lib/insights";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme";

// Weekly insights come from anonymous parent reports. The AI summary only ever receives the counts below.
export function WeeklyReport({ route }: { route: string }) {
  const c = useTheme();
  const [ins, setIns] = useState<Insights | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [ai, setAi] = useState<{ state: "idle" | "loading" | "done" | "off" | "error"; text?: string }>({ state: "idle" });

  useEffect(() => {
    if (!route) return;
    supabase.functions.invoke(`route-report/${encodeURIComponent(route)}/report?weeks=4`, { method: "GET" })
      .then(({ data, error }) => {
        if (error || !data) { setLoadErr(true); return; }
        setIns(computeInsights((data.reports ?? []) as Report[], 4));
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
