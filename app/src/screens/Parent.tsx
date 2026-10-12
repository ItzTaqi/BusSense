import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import { Badge, Btn, Card, H, Hero, Input, P, Screen } from "../components/Ui";
import { RouteTrack } from "../components/RouteTrack";
import { sendReport, subscribeStatus, StatusRow } from "../lib/api";
import { SelectField } from "../components/SelectField";
import { DISTRICTS, districtLabel } from "../data/districts";
import { leaveByMinutes, sourceLabel } from "../lib/leaveBy";
import { DEMO_STEPS } from "../demo/scenario";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/store";
import { radius, type, useTheme } from "../theme";
import { AlertsSettings } from "./AlertsSettings";
import { ReportCard } from "./ReportCard";

export function Parent({ tab }: { tab: string }) {
  const demo = useApp((s) => s.demo);
  const c = useTheme();
  const [route, setRoute] = useState("");
  const [district, setDistrict] = useState(districtLabel(DISTRICTS[0]));
  const [stop, setStop] = useState("");
  const [walk, setWalk] = useState("3");
  const [saved, setSaved] = useState(false);
  const [row, setRow] = useState<StatusRow | null>(null);
  const [step, setStep] = useState(0);

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
  const field = { textAlign: "center" as const, fontSize: 20, borderWidth: 2, borderColor: c.line, borderRadius: radius, padding: 14, color: c.ink, backgroundColor: c.card, minHeight: 56 } as const;
  const leave = row ? leaveByMinutes(row.eta_lo, Number(walk) || 3) : null;

  if (!saved) return (
    <Screen>
      <H>Set up your stop</H>
      <SelectField label="District" value={district} options={DISTRICTS.map(districtLabel)} onSelect={setDistrict} />
      <Input accessibilityLabel="Bus number" placeholder="Bus number" value={route} onChangeText={setRoute} maxLength={8} />
      <Input accessibilityLabel="Stop" placeholder="Stop" value={stop} onChangeText={setStop} />
      <P dim>Minutes to walk to your stop</P>
      <Input accessibilityLabel="Walking minutes" placeholder="Walking minutes" keyboardType="number-pad" value={walk} onChangeText={setWalk} />
      <Btn primary label="Save" disabled={!route || !stop} onPress={save} />
    </Screen>
  );
  if (tab === "alerts") return <Screen><AlertsSettings route={route} stop={stop} /></Screen>;
  if (tab === "report") return <Screen><ReportCard route={route} /></Screen>;

  const hasEta = row?.eta_min != null;
  const src = sourceLabel(row?.source ?? "NO_DATA");
  return (
    <Screen>
      <Hero icon="bus">
        <P color="rgba(255,255,255,0.8)">Bus {route} · stop {stop}</P>
        <Badge text={src} />
        {hasEta ? (
          <>
            <Text accessibilityLabel={`Arrives in about ${row!.eta_min} minutes`}
              style={{ fontSize: type.hero, fontWeight: "700", color: "#fff", letterSpacing: -2, lineHeight: 62, textAlign: "center" }}>
              {row!.eta_min}<Text style={{ fontSize: type.title, letterSpacing: 0 }}> min</Text>
            </Text>
            <P color="rgba(255,255,255,0.9)">Likely between {row!.eta_lo} and {row!.eta_hi} min</P>
          </>
        ) : <P color="#fff">No ETA yet. We only show a bus when 3+ riders are on it.</P>}
        <RouteTrack stopsAway={row?.stops_away ?? null} />
      </Hero>
      {leave !== null && (
        <Card tone="brand" icon="walk" title={leave === 0 ? "Leave now" : `Leave in about ${leave} min`}>
          <P color={c.onBrand}>Includes {walk} min walk and a 2 min cushion.</P>
        </Card>
      )}
      <Card icon="megaphone" title="Tell other families">
        <Btn danger icon="close-circle" label="Bus didn't come" onPress={async () => { await sendReport(route, stop, "no_show"); Alert.alert("Thanks", "Report sent (anonymous)."); }} />
        <Btn icon="flash" label="Bus came early" onPress={async () => { await sendReport(route, stop, "early"); Alert.alert("Thanks", "Report sent (anonymous)."); }} />
      </Card>
    </Screen>
  );
}
