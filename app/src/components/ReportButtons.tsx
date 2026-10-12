import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { sendReport } from "../lib/api";
import { useTheme } from "../theme";
import { Btn } from "./Ui";

type Kind = "no_show" | "early";
type State = "idle" | "sending" | "sent" | "error";
const COOLDOWN_MS = 60_000; // stops accidental double reports

// Two responsive buttons: side by side when there is room, stacked on narrow screens (flexWrap),
// with instant feedback: Sending... -> Sent (locked for a minute) or a retry message.
export function ReportButtons({ route, stop }: { route: string; stop: string }) {
  const c = useTheme();
  const [state, setState] = useState<Record<Kind, State>>({ no_show: "idle", early: "idle" });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = async (kind: Kind) => {
    if (state[kind] === "sending" || state[kind] === "sent") return;
    setState((s) => ({ ...s, [kind]: "sending" }));
    const { error } = await sendReport(route, stop, kind);
    setState((s) => ({ ...s, [kind]: error ? "error" : "sent" }));
    if (!error) timers.current.push(setTimeout(() => setState((s) => ({ ...s, [kind]: "idle" })), COOLDOWN_MS));
  };
  const label = (kind: Kind, idle: string) =>
    state[kind] === "sending" ? "Sending…" : state[kind] === "sent" ? "Sent. Thank you" : state[kind] === "error" ? "Couldn't send. Tap to retry" : idle;
  const any = Object.values(state).includes("sent");

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <View style={{ flexGrow: 1, flexBasis: 150 }}>
          <Btn danger icon={state.no_show === "sent" ? "checkmark-circle" : "close-circle"} label={label("no_show", "Bus didn't come")}
            disabled={state.no_show === "sending" || state.no_show === "sent"} onPress={() => send("no_show")} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 150 }}>
          <Btn icon={state.early === "sent" ? "checkmark-circle" : "flash"} label={label("early", "Bus came early")}
            disabled={state.early === "sending" || state.early === "sent"} onPress={() => send("early")} />
        </View>
      </View>
      <Text accessibilityLiveRegion="polite" style={{ fontSize: 12, textAlign: "center", color: c.sub }}>
        {any ? "Reports are anonymous and help other families." : "Reports are anonymous."}
      </Text>
    </View>
  );
}
