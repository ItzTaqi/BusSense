import { useEffect, useState } from "react";
import { Alert, ScrollView, TextInput } from "react-native";
import { Badge, Btn, H, P } from "../components/Ui";
import { AlertsSettings } from "./AlertsSettings";
import { ReportCard } from "./ReportCard";
import { sendReport, subscribeStatus, StatusRow } from "../lib/api";
import { leaveByMinutes, sourceLabel } from "../lib/leaveBy";
import { DEMO_STEPS } from "../demo/scenario";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/store";

export function Parent() {
  const demo = useApp((s) => s.demo);
  const [route, setRoute] = useState("");
  const [stop, setStop] = useState("");
  const [walk, setWalk] = useState("3");
  const [saved, setSaved] = useState(false);
  const [row, setRow] = useState<StatusRow | null>(null);
  const [step, setStep] = useState(0);
  const [panel, setPanel] = useState<"" | "alerts" | "report">("");

  useEffect(() => {
    if (!demo) return;
    setRoute("DEMO-12"); setStop("demo-3"); setSaved(true);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, DEMO_STEPS.length - 1)), 4000);
    return () => clearInterval(id);
  }, [demo]);
  useEffect(() => { if (demo) setRow(DEMO_STEPS[step]); }, [demo, step]);
  useEffect(() => { if (saved && !demo) return subscribeStatus(route, stop, setRow); }, [saved, demo, route, stop]);

  const save = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("followers").upsert({ id: data.user.id, walk_min: Number(walk) || 3 });
      await supabase.from("follows").upsert({ follower_id: data.user.id, route_label: route, stop_id: stop });
    }
    setSaved(true);
  };
  const field = { fontSize: 20, borderWidth: 1, padding: 12 } as const;
  const leave = row ? leaveByMinutes(row.eta_lo, Number(walk) || 3) : null;

  if (!saved) return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 16 }}>
      <H>Set up your stop</H>
      <TextInput accessibilityLabel="Bus number" placeholder="Bus number" style={field} value={route} onChangeText={setRoute} />
      <TextInput accessibilityLabel="Stop" placeholder="Stop" style={field} value={stop} onChangeText={setStop} />
      <TextInput accessibilityLabel="Walking minutes" placeholder="Walking minutes" keyboardType="number-pad" style={field} value={walk} onChangeText={setWalk} />
      <Btn label="Save" disabled={!route || !stop} onPress={save} />
    </ScrollView>
  );
  if (panel === "alerts") return <ScrollView contentContainerStyle={{ gap: 14, padding: 16 }}><AlertsSettings route={route} stop={stop} /><Btn label="Back" onPress={() => setPanel("")} /></ScrollView>;
  if (panel === "report") return <ScrollView contentContainerStyle={{ gap: 14, padding: 16 }}><ReportCard route={route} /><Btn label="Back" onPress={() => setPanel("")} /></ScrollView>;
  return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 16 }}>
      <H>Bus {route} · stop {stop}</H>
      {demo && <P>DEMO MODE: scripted scenario, not real data.</P>}
      <Badge text={sourceLabel(row?.source ?? "NO_DATA")} />
      <P>{row?.eta_min != null ? `ETA ${row.eta_min} min (${row.eta_lo}–${row.eta_hi})` : "No ETA available"}</P>
      {row?.stops_away != null && <P>{row.stops_away} stops away</P>}
      {leave !== null && <P>Leave in about {leave} min</P>}
      <Btn label="Alert settings" onPress={() => setPanel("alerts")} />
      <Btn label="Route report card" onPress={() => setPanel("report")} />
      <Btn danger label="Bus didn't come" onPress={async () => { await sendReport(route, stop, "no_show"); Alert.alert("Thanks", "Report sent (anonymous)."); }} />
      <Btn label="Bus came early" onPress={async () => { await sendReport(route, stop, "early"); Alert.alert("Thanks", "Report sent (anonymous)."); }} />
    </ScrollView>
  );
}
