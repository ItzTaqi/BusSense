import { useState } from "react";
import { View } from "react-native";
import { Btn, H, P } from "../components/Ui";
import { startRecording, stopRecording } from "../lib/devRecorder";

export function Record() {
  const [label, setLabel] = useState<"bus" | "car" | "walk">("bus");
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  return (
    <View style={{ gap: 14, padding: 16 }}>
      <H>Logging build</H>
      <P>Dev data for training. Only record with permission. Deleted after evaluation.</P>
      <P>Label: {label}</P>
      {(["bus", "car", "walk"] as const).map((l) => <Btn key={l} label={l} disabled={on} onPress={() => setLabel(l)} />)}
      <P>{on ? "● Recording" : "Not recording"}</P>
      {err ? <P>{err}</P> : null}
      <Btn label={on ? "Stop" : "Start recording"} onPress={async () => {
        try { setErr(""); if (on) { await stopRecording(); setOn(false); } else { await startRecording(label); setOn(true); } }
        catch (e) { setErr(String(e)); }
      }} />
    </View>
  );
}
