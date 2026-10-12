import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { H, Screen } from "../components/Ui";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme";

const ITEMS = [
  { key: "leave_now", title: "Leave now", desc: "When your bus is about to reach your stop." },
  { key: "running_late", title: "Running late", desc: "When it is 7+ minutes later than usual." },
  { key: "not_seen", title: "Not seen yet", desc: "No bus seen 10 minutes after the usual time." },
  { key: "passed", title: "Passed your stop", desc: "When the bus goes 100 m past your stop." },
] as const;

export function AlertsSettings({ route, stop }: { route: string; stop: string }) {
  const c = useTheme();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ leave_now: true, running_late: true, not_seen: true, passed: true });
  const toggle = async (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v }; setPrefs(next);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("follows").update({ alert_prefs: next }).eq("follower_id", data.user.id).eq("route_label", route).eq("stop_id", stop);
  };
  return (
    <Screen>
      <H>Alerts</H>
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
        {ITEMS.map((it, i) => (
          <View key={it.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14,
            borderTopWidth: i === 0 ? 0 : 1, borderColor: c.line }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.ink }}>{it.title}</Text>
              <Text style={{ fontSize: 12, lineHeight: 17, color: c.sub }}>{it.desc}</Text>
            </View>
            <Switch accessibilityLabel={it.title} value={prefs[it.key]} onValueChange={(v) => toggle(it.key, v)}
              trackColor={{ true: c.primary, false: c.line }} thumbColor="#FFFFFF" />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 12, textAlign: "center", color: c.sub }}>At most one alert per stop every 5 minutes.</Text>
    </Screen>
  );
}
