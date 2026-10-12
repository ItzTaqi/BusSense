import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Badge, Btn, Hero, P, PulseDot, Screen } from "../components/Ui";
import { UPLOAD_THRESHOLD } from "../classifier/predict";
import { t } from "../i18n";
import { endTrip, startTrip } from "../lib/tripService";
import { useApp } from "../state/store";
import { useTheme } from "../theme";

export function RiderHome({ go }: { go: (s: string) => void }) {
  const { riderStatus, kRiders, declaredBus, lang, set } = useApp();
  const c = useTheme();
  const [skip, setSkip] = useState(false);
  const [err, setErr] = useState("");
  const listening = riderStatus === "listening" || riderStatus === "onBus";
  const label = riderStatus === "onBus" ? `On Bus ${declaredBus} · ${kRiders} riders`
    : riderStatus === "listening" ? t("rider.status.listening", lang)
    : riderStatus === "paused" ? "Paused" : t("rider.status.sleeping", lang);
  return (
    <Screen>
      <Hero>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {listening && <PulseDot color="#FFFFFF" />}
          <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.6, textAlign: "center" }}>{label}</Text>
        </View>
        <P color="rgba(255,255,255,0.88)">A bus is shown to parents only when 3 or more riders are on it.</P>
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
      {err ? <P color={c.danger}>{err}</P> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={skip ? "Back to normal" : "Not riding today"} onPress={() => { setSkip(!skip); set({ riderStatus: skip ? "sleeping" : "paused" }); }}
        style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>{skip ? "Back to normal" : "Not riding today"}</Text>
      </Pressable>
    </Screen>
  );
}
