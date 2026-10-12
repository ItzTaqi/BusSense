import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { Card, H, P } from "../components/Ui";
import { useTheme } from "../theme";
import { supabase } from "../lib/supabase";

const KEYS = [["leave_now", "Leave now"], ["running_late", "Running late"], ["not_seen", "Not seen yet"], ["passed", "Passed your stop"]] as const;

export function AlertsSettings({ route, stop }: { route: string; stop: string }) {
  const c = useTheme();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ leave_now: true, running_late: true, not_seen: true, passed: true });
  const toggle = async (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v }; setPrefs(next);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("follows").update({ alert_prefs: next }).eq("follower_id", data.user.id).eq("route_label", route).eq("stop_id", stop);
  };
  return (
    <View style={{ gap: 14 }}>
      <H>Alerts</H>
      <P>At most one alert per stop every 5 minutes.</P>
      <Card>
      {KEYS.map(([k, label]) => (
        <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 20, color: c.ink }}>{label}</Text>
          <Switch accessibilityLabel={label} value={prefs[k]} onValueChange={(v) => toggle(k, v)} />
        </View>
      ))}
      </Card>
    </View>
  );
}
