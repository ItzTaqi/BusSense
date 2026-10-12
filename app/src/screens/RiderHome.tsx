import { useState } from "react";
import { Text, View } from "react-native";
import { Badge, Btn, Card, Hero, P, PulseDot, Screen } from "../components/Ui";
import { UPLOAD_THRESHOLD } from "../classifier/predict";
import { t } from "../i18n";
import { endTrip, startTrip } from "../lib/tripService";
import { useApp } from "../state/store";
import { palette } from "../theme";

export function RiderHome({ go }: { go: (s: string) => void }) {
  const { riderStatus, kRiders, declaredBus, lang, set } = useApp();
  const [skip, setSkip] = useState(false);
  const [err, setErr] = useState("");
  const listening = riderStatus === "listening" || riderStatus === "onBus";
  const label = riderStatus === "onBus" ? `On Bus ${declaredBus} · ${kRiders} riders`
    : riderStatus === "listening" ? t("rider.status.listening", lang)
    : riderStatus === "paused" ? "Paused" : t("rider.status.sleeping", lang);
  return (
    <Screen>
      <Hero icon={listening ? "radio" : "moon"}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {listening && <PulseDot color={palette.mint} />}
          <Text accessibilityRole="header" style={{ fontSize: 34, fontWeight: "900", color: "#fff", letterSpacing: -1 }}>{label}</Text>
        </View>
        <P color="rgba(255,255,255,0.85)">A bus is shown to parents only when 3 or more riders are on it. Never you.</P>
        {riderStatus === "onBus" && <Badge text="LIVE" />}
      </Hero>
      {!listening ? (
        <Btn primary icon="bus" label="I'm on the bus" onPress={async () => {
          try { setErr(""); const tok = await startTrip(declaredBus, (p) => set({ riderStatus: p >= UPLOAD_THRESHOLD ? "onBus" : "listening" })); set({ riderStatus: "listening", tripToken: tok }); }
          catch (e) { setErr(String(e)); }
        }} />
      ) : (
        <Btn danger icon="stop-circle" label="End trip" onPress={async () => { await endTrip(); set({ riderStatus: "sleeping", kRiders: 0 }); go("receipt"); }} />
      )}
      {err ? <Card tone="alt" icon="warning" title="Couldn't start"><P dim>{err}</P></Card> : null}
      <Card icon="cloudy-night" title="Not riding today?">
        <Btn icon={skip ? "arrow-undo" : "pause-circle"} label={skip ? "Back to normal" : "Not riding today"} onPress={() => { setSkip(!skip); set({ riderStatus: skip ? "sleeping" : "paused" }); }} />
      </Card>
      <Card tone="alt" icon="lock-closed" title="Your privacy">
        <P dim>Random trip code, no name. Points deleted when the trip ends.</P>
        <Btn icon="shield-checkmark" label="Privacy center" onPress={() => go("privacy")} />
      </Card>
    </Screen>
  );
}
