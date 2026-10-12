import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { IconBubble, type IconName } from "../components/Ui";
import { useApp } from "../state/store";
import { useTheme } from "../theme";
import { Privacy } from "./Privacy";
import { Receipt } from "./Receipt";
import { Record } from "./Record";

export type SettingsPage = "" | "privacy" | "receipt" | "record";

// One place for everything that is not the main job: privacy, receipts, recording, language, demo.
// Rider-only rows (receipt, record) are hidden for parents.
export function Settings({ page, setPage }: { page: SettingsPage; setPage: (p: SettingsPage) => void }) {
  const c = useTheme();
  const { mode, lang, demo, set } = useApp();

  const Row = ({ icon, label, hint, onPress, right }: { icon: IconName; label: string; hint?: string; onPress: () => void; right?: string }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 }}>
      <IconBubble name={icon} size={34} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 13, color: c.sub }}>{hint}</Text> : null}
      </View>
      {right ? <Text style={{ fontSize: 14, fontWeight: "600", color: c.sub }}>{right}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={c.sub} />
    </Pressable>
  );
  const Group = ({ children }: { children: React.ReactNode }) => (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: "hidden" }}>{children}</View>
  );
  const Sep = () => <View style={{ height: 1, marginLeft: 60, backgroundColor: c.line }} />;

  if (page) {
    const titles = { privacy: "Privacy", receipt: "Trip receipt", record: "Record data" } as const;
    return (
      <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={() => setPage("")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 14, minHeight: 48 }}>
          <Ionicons name="chevron-back" size={22} color={c.primary} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.primary }}>Settings</Text>
          <Text accessibilityRole="header" style={{ flex: 1, textAlign: "center", marginRight: 70, fontSize: 16, fontWeight: "700", color: c.ink }}>{titles[page]}</Text>
        </Pressable>
        {page === "privacy" && <Privacy />}
        {page === "receipt" && <Receipt />}
        {page === "record" && <Record />}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "800", color: c.ink }}>Settings</Text>
      <Group>
        <Row icon="shield-checkmark" label="Privacy" hint="What we collect and your data" onPress={() => setPage("privacy")} />
        {mode === "rider" && (<>
          <Sep /><Row icon="receipt" label="Trip receipt" hint="Was a bus published? Points kept" onPress={() => setPage("receipt")} />
          <Sep /><Row icon="recording" label="Record data" hint="Logging build for training" onPress={() => setPage("record")} />
        </>)}
      </Group>
      <Group>
        <Row icon="language" label="Language" right={lang === "en" ? "English" : "Español"} onPress={() => set({ lang: lang === "en" ? "es" : "en" })} />
        <Sep />
        <Row icon="play-circle" label="Demo" hint="Sample stop board, not real data" onPress={() => set({ demo: true })} right={demo ? "On" : undefined} />
      </Group>
    </ScrollView>
  );
}
