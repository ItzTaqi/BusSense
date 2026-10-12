import { useState } from "react";
import { Btn, Card, H, P, Screen } from "../components/Ui";
import { startRecording, stopRecording } from "../lib/devRecorder";

export function Record() {
  const [label, setLabel] = useState<"bus" | "car" | "walk">("bus");
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Screen>
      <Card icon="recording" title="Logging build" />
      <P>Dev data for training. Only record with permission. Deleted after evaluation.</P>
      <Card><P>Label: {label}</P></Card>
      {(["bus", "car", "walk"] as const).map((l) => <Btn key={l} label={l} disabled={on} onPress={() => setLabel(l)} />)}
      <P>{on ? "● Recording" : "Not recording"}</P>
      {err ? <P>{err}</P> : null}
      <Btn primary icon={on ? "stop-circle" : "radio-button-on"} label={on ? "Stop" : "Start recording"} onPress={async () => {
        try { setErr(""); if (on) { await stopRecording(); setOn(false); } else { await startRecording(label); setOn(true); } }
        catch (e) { setErr(String(e)); }
      }} />
    </Screen>
  );
}
