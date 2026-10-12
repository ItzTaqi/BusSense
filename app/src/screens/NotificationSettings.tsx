import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { SelectField } from "../components/SelectField";
import { Btn } from "../components/Ui";
import { kvGet, kvSet } from "../lib/kv";
import { KEYS } from "../lib/localKeys";
import { supabase } from "../lib/supabase";
import { label, parseLabel, timeOptions, toHHMM } from "../lib/times";
import { useApp } from "../state/store";
import { useTheme } from "../theme";

const ITEMS = [
  { key: "leave_now", title: "Leave now", desc: "When your bus is about to reach your stop." },
  { key: "running_late", title: "Running late", desc: "When it is 7+ minutes later than usual." },
  { key: "not_seen", title: "Not seen yet", desc: "No bus seen 10 minutes after the usual time." },
  { key: "passed", title: "Passed your stop", desc: "When the bus goes 100 m past your stop." },
] as const;
const QUIET_FROM = timeOptions(18 * 60, 23 * 60 + 30);   // 6:00 PM - 11:30 PM
const QUIET_TO = timeOptions(4 * 60, 9 * 60);            // 4:00 AM - 9:00 AM
const KEY = KEYS.alertPrefs;
type Prefs = Record<string, boolean | string>;
const DEFAULTS: Prefs = { leave_now: true, running_late: true, not_seen: true, passed: true, quiet_start: "21:00", quiet_end: "06:30" };

// Parent alerts and notifications. Saved on the phone and sent to the server (per followed bus) so it can respect them.
export function NotificationSettings() {
  const c = useTheme();
  const { children, activeChild } = useApp();
  const child = children[Math.min(activeChild, children.length - 1)];
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [perm, setPerm] = useState<"granted" | "denied" | "undetermined" | "unavailable">("undetermined");

  useEffect(() => {
    kvGet(KEY).then((raw) => { if (raw) { try { setPrefs({ ...DEFAULTS, ...JSON.parse(raw) }); } catch { /* ignore */ } } });
    Notifications.getPermissionsAsync().then((p) => setPerm(p.granted ? "granted" : p.canAskAgain === false ? "denied" : "undetermined")).catch(() => setPerm("unavailable"));
  }, []);

  const save = async (next: Prefs) => {
    setPrefs(next);
    await kvSet(KEY, JSON.stringify(next));
    if (!child) return;
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) await supabase.from("follows").update({ alert_prefs: next }).eq("follower_id", data.user.id).eq("route_label", child.bus).eq("stop_id", child.stop);
    } catch { /* offline: saved on the phone, sent next time */ }
  };
  const ask = async () => {
    try { const p = await Notifications.requestPermissionsAsync(); setPerm(p.granted ? "granted" : "denied"); } catch { setPerm("unavailable"); }
  };
  const hhmmLabel = (hhmm: string, fallbackMin: number) => {
    const [h, m] = String(hhmm).split(":").map(Number);
    return label(Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : fallbackMin);
  };
  const fromLabel = hhmmLabel(String(prefs.quiet_start), 21 * 60);
  const toLabel = hhmmLabel(String(prefs.quiet_end), 6 * 60 + 30);

  const box = { borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card };
  const heading = (t: string) => <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: "700", letterSpacing: 0.6, color: c.sub, textTransform: "uppercase" }}>{t}</Text>;
  const permText = { granted: "Notifications are on.", denied: "Notifications are off. Turn them on in your phone's Settings.", undetermined: "Allow notifications so GoNC can alert you.", unavailable: "Notifications aren't available here." }[perm];

  return (
    <View style={{ padding: 20, gap: 24 }}>
      <View style={{ gap: 6, marginTop: 4 }}>{heading("Notifications")}
        <View style={{ ...box, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.ink }}>{permText}</Text>
          {perm === "undetermined" && <Btn primary icon="notifications" label="Allow notifications" onPress={ask} />}
        </View>
      </View>

      <View style={{ gap: 6 }}>{heading("Alert types")}
        <View style={box}>
          {ITEMS.map((it, i) => (
            <View key={it.key} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.line }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>{it.title}</Text>
                <Text style={{ fontSize: 13, lineHeight: 18, color: c.sub }}>{it.desc}</Text>
              </View>
              <Switch accessibilityLabel={it.title} value={prefs[it.key] !== false} onValueChange={(v) => save({ ...prefs, [it.key]: v })} trackColor={{ true: c.primary, false: c.line }} thumbColor="#FFFFFF" />
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: c.sub }}>At most one alert per stop every 5 minutes.</Text>
      </View>

      <View style={{ gap: 6 }}>{heading("Quiet hours")}
        <View style={{ ...box, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 13, lineHeight: 18, color: c.sub }}>No alerts during these hours.</Text>
          <SelectField label="From" value={fromLabel} options={QUIET_FROM} onSelect={(v) => save({ ...prefs, quiet_start: toHHMM(parseLabel(v) ?? 21 * 60) })} />
          <SelectField label="Until" value={toLabel} options={QUIET_TO} onSelect={(v) => save({ ...prefs, quiet_end: toHHMM(parseLabel(v) ?? 6 * 60 + 30) })} />
        </View>
      </View>
    </View>
  );
}
