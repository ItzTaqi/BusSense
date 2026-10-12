import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from "react-native";
import { sendReport } from "../lib/api";
import { useTheme } from "../theme";
import { Btn } from "./Ui";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

type Kind = "no_show" | "early";
type State = "idle" | "sending" | "sent" | "error";
const COOLDOWN_MS = 60_000; // stops accidental double reports

// One quiet button. Tap it and it opens into the two choices. Sending closes it again with a short thank-you.
export function ReportButtons({ route, stop }: { route: string; stop: string }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<Kind, State>>({ no_show: "idle", early: "idle" });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const toggle = (v: boolean) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(v); };
  const send = async (kind: Kind) => {
    if (state[kind] === "sending" || state[kind] === "sent") return;
    setState((s) => ({ ...s, [kind]: "sending" }));
    const { error } = await sendReport(route, stop, kind);
    setState((s) => ({ ...s, [kind]: error ? "error" : "sent" }));
    if (!error) {
      toggle(false);
      timers.current.push(setTimeout(() => setState((s) => ({ ...s, [kind]: "idle" })), COOLDOWN_MS));
    }
  };
  const label = (kind: Kind, idle: string) =>
    state[kind] === "sending" ? "Sending…" : state[kind] === "error" ? "Couldn't send. Tap to retry" : idle;
  const sent = state.no_show === "sent" || state.early === "sent";

  return (
    <View style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Report a problem" accessibilityState={{ expanded: open }} onPress={() => toggle(!open)}
        style={({ pressed }) => ({ minHeight: 50, borderRadius: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          backgroundColor: c.cardAlt, opacity: pressed ? 0.85 : 1 })}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name={sent ? "checkmark-circle" : "flag"} size={20} color={c.primary} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>{sent ? "Thanks, report sent" : "Report a problem"}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={c.sub} />
      </Pressable>
      {open && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View style={{ flexGrow: 1, flexBasis: 150 }}>
            <Btn danger icon="close-circle" label={label("no_show", "Bus didn't come")} disabled={state.no_show === "sending" || state.no_show === "sent"} onPress={() => send("no_show")} />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 150 }}>
            <Btn icon="flash" label={label("early", "Bus came early")} disabled={state.early === "sending" || state.early === "sent"} onPress={() => send("early")} />
          </View>
        </View>
      )}
      <Text accessibilityLiveRegion="polite" style={{ fontSize: 12, textAlign: "center", color: c.sub }}>
        {sent ? "Reports are anonymous and help other families." : open ? "Reports are anonymous." : ""}
      </Text>
    </View>
  );
}
