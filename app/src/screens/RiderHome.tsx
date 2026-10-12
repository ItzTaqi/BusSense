import { useState } from "react";
import { Btn, Card, H, P, Screen } from "../components/Ui";
import { t } from "../i18n";
import { useApp } from "../state/store";
import { endTrip, startTrip } from "../lib/tripService";
import { UPLOAD_THRESHOLD } from "../classifier/predict";

export function RiderHome({ go }: { go: (s: string) => void }) {
  const { riderStatus, kRiders, declaredBus, lang, set } = useApp();
  const [skip, setSkip] = useState(false);
  const [err, setErr] = useState("");
  const label = riderStatus === "onBus" ? `On Bus ${declaredBus} · ${kRiders} riders`
    : riderStatus === "listening" ? t("rider.status.listening", lang)
    : riderStatus === "paused" ? "Paused" : t("rider.status.sleeping", lang);
  return (
    <Screen>
      <Card tone={riderStatus === "onBus" ? "brand" : undefined}>
        <H>{label}</H>
        {riderStatus === "listening" && <P>● Listening</P>}
        <P dim>A bus is shown only when 3 or more riders are on it.</P>
      </Card>
      <Btn primary label="I'm on the bus" onPress={async () => {
        try { setErr(""); const tok = await startTrip(declaredBus, (p) => set({ riderStatus: p >= UPLOAD_THRESHOLD ? "onBus" : "listening" })); set({ riderStatus: "listening", tripToken: tok }); }
        catch (e) { setErr(String(e)); }
      }} />
      {err ? <P>{err}</P> : null}
      <Btn label={skip ? "Back to normal" : "Not riding today"} onPress={() => { setSkip(!skip); set({ riderStatus: skip ? "sleeping" : "paused" }); }} />
      <Btn label="End trip" onPress={async () => { await endTrip(); set({ riderStatus: "sleeping", kRiders: 0 }); go("receipt"); }} />
      <Btn label="Privacy center" onPress={() => go("privacy")} />
      <Btn label="Record data (logging build)" onPress={() => go("record")} />
    </Screen>
  );
}
