import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { IconBubble, type IconName } from "../components/Ui";
import { useApp } from "../state/store";
import { useTheme } from "../theme";
import { Privacy } from "./Privacy";
import { NotificationSettings } from "./NotificationSettings";
import { PastRides } from "./PastRides";

export type SettingsPage = "" | "privacy" | "rides" | "notifications";

// One place for everything that is not the main job: privacy, receipts, recording, language, demo.
// Rider-only rows (receipt, record) are hidden for parents.
export function Settings({ page, setPage, onAddChild }: { page: SettingsPage; setPage: (p: SettingsPage) => void; onAddChild: () => void }) {
  const c = useTheme();
  const { mode, lang, demo, set, children, removeChild, appearance, setAppearance } = useApp();

  const Row = ({ icon, label, hint, onPress, right }: { icon: IconName; label: string; hint?: string; onPress: () => void; right?: string }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ minHeight: 72, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18, paddingVertical: 14 }}>
      <IconBubble name={icon} size={40} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 13, lineHeight: 18, color: c.sub }}>{hint}</Text> : null}
      </View>
      {right ? <Text style={{ fontSize: 14, fontWeight: "600", color: c.sub }}>{right}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={c.sub} />
    </Pressable>
  );
  const Group = ({ children }: { children: React.ReactNode }) => (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>{children}</View>
  );
  const Sep = () => <View style={{ height: 1, marginLeft: 74, backgroundColor: c.line }} />;

  if (page) {
    const titles = { privacy: "Privacy and Terms", rides: "Past rides", notifications: "Notifications" } as const;
    return (
      <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={() => setPage("")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 14, minHeight: 48 }}>
          <Ionicons name="chevron-back" size={22} color={c.primary} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.primary }}>Settings</Text>
          <Text accessibilityRole="header" style={{ flex: 1, textAlign: "center", marginRight: 70, fontSize: 16, fontWeight: "700", color: c.ink }}>{titles[page]}</Text>
        </Pressable>
        {page === "notifications" && <NotificationSettings />}
        {page === "privacy" && <Privacy />}
        {page === "rides" && <PastRides />}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 28 }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "800", color: c.ink, marginBottom: 2 }}>Settings</Text>
      <Group>
        {mode === "parent" && (<>
          <Row icon="notifications" label="Notifications" hint="Alerts, quiet hours" onPress={() => setPage("notifications")} />
          <Sep />
        </>)}
        <Row icon="shield-checkmark" label="Privacy and Terms" hint="How your data is used" onPress={() => setPage("privacy")} />
        {mode === "rider" && (<>
          <Sep /><Row icon="time" label="Past rides" hint="Your trips and whether the bus was shown" onPress={() => setPage("rides")} />
        </>)}
      </Group>
      {mode === "parent" && (
        <Group>
          {children.map((k, i) => (
            <View key={k.id}>
              {i > 0 && <Sep />}
              <View style={{ minHeight: 72, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18, paddingVertical: 14 }}>
                <IconBubble name="person-circle" size={40} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{k.name}</Text>
                  <Text style={{ fontSize: 13, color: c.sub }}>Bus {k.bus} · {k.stop}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${k.name}`} onPress={() => removeChild(k.id)} style={{ padding: 10 }}>
                  <Ionicons name="trash-outline" size={20} color={c.danger} />
                </Pressable>
              </View>
            </View>
          ))}
          {children.length > 0 && <Sep />}
          <Row icon="add-circle" label="Add a child" onPress={onAddChild} />
        </Group>
      )}
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", letterSpacing: 0.6, color: c.sub, textTransform: "uppercase" }}>Appearance</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", padding: 4, borderRadius: 16, backgroundColor: c.cardAlt }}>
          {([["system", "System", "phone-portrait"], ["light", "Light", "sunny"], ["dark", "Dark", "moon"]] as const).map(([key, name, icon]) => {
            const on = appearance === key;
            return (
              <Pressable key={key} accessibilityRole="radio" accessibilityLabel={`${name} appearance`} accessibilityState={{ selected: on }} onPress={() => setAppearance(key)}
                style={{ flex: 1, minHeight: 48, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: on ? c.brand : "transparent" }}>
                <Ionicons name={icon} size={17} color={on ? c.onBrand : c.sub} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: on ? c.onBrand : c.ink }}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 12, lineHeight: 17, color: c.sub }}>{appearance === "system" ? "Matches your phone's light or dark setting." : `Always ${appearance}, whatever your phone is set to.`}</Text>
      </View>
      <Group>
        <Row icon="language" label="Language" right={lang === "en" ? "English" : "Español"} onPress={() => set({ lang: lang === "en" ? "es" : "en" })} />
        <Sep />
        <Row icon="play-circle" label="Demo" hint="Sample stop board, not real data" onPress={() => set({ demo: true })} right={demo ? "On" : undefined} />
      </Group>
    </ScrollView>
  );
}
