import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from "react-native";
import { Footer } from "./src/components/Footer";
import { TabBar, type Tab } from "./src/components/TabBar";
import { t } from "./src/i18n";
import { ensureAnonSession } from "./src/lib/supabase";
import { Onboarding } from "./src/screens/Onboarding";
import { Welcome } from "./src/screens/Welcome";
import { Parent } from "./src/screens/Parent";
import { Privacy } from "./src/screens/Privacy";
import { Receipt } from "./src/screens/Receipt";
import { Record } from "./src/screens/Record";
import { RiderHome } from "./src/screens/RiderHome";
import { useApp } from "./src/state/store";
import { useTheme } from "./src/theme";

const RIDER_TABS: Tab[] = [
  { key: "home", label: "Ride", icon: "bus" }, { key: "receipt", label: "Receipt", icon: "receipt" },
  { key: "record", label: "Record", icon: "recording" }, { key: "privacy", label: "Privacy", icon: "shield-checkmark" },
];
const PARENT_TABS: Tab[] = [
  { key: "board", label: "Stop board", icon: "location" }, { key: "alerts", label: "Alerts", icon: "notifications" },
  { key: "report", label: "Report card", icon: "stats-chart" },
];

export default function App() {
  const { mode, lang, demo, set } = useApp();
  const c = useTheme();
  const [tab, setTab] = useState("home");
  const [onboarding, setOnboarding] = useState(false);
  useEffect(() => { ensureAnonSession().catch(() => {}); }, []);

  const switchMode = (m: "rider" | "parent") => { set({ mode: m }); setTab(m === "rider" ? "home" : "board"); };
  const welcome = !mode && !onboarding;
  let body = welcome
    ? <Welcome onRider={() => setOnboarding(true)}
        onParent={() => { set({ mode: "parent" }); setTab("board"); }}
        onDemo={() => { set({ demo: true, mode: "parent" }); setTab("board"); }} />
    : <Onboarding />;
  if (mode === "parent") body = <Parent tab={tab} />;
  if (mode === "rider") {
    body = tab === "privacy" ? <Privacy /> : tab === "receipt" ? <Receipt />
      : tab === "record" ? <Record /> : <RiderHome go={setTab} />;
  }
  const pill = (label: string, icon: keyof typeof Ionicons.glyphMap, on: boolean, onPress: () => void, hint?: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={hint ?? label} accessibilityState={{ selected: on }} onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: 999,
        backgroundColor: on ? "#FFFFFF" : "rgba(255,255,255,0.14)" }}>
      <Ionicons name={icon} size={18} color={on ? "#0B3FBF" : "#fff"} />
      <Text style={{ fontSize: 15, fontWeight: "800", color: on ? "#0B3FBF" : "#fff" }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar barStyle="light-content" />
      {welcome ? <SafeAreaView /> : <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView>
          <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bus" size={24} color="#0B3FBF" />
              </View>
              <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.5 }}>GoYellow</Text>
            </View>
            {mode && (
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {pill(t("mode.rider", lang), "person", mode === "rider", () => switchMode("rider"))}
                {pill(t("mode.parent", lang), "people", mode === "parent", () => switchMode("parent"))}
                {pill(demo ? "Demo on" : "Demo", "play-circle", demo, () => { set({ demo: !demo }); if (!demo) switchMode("parent"); }, "Toggle demo mode")}
                {pill(lang === "en" ? "ES" : "EN", "language", false, () => set({ lang: lang === "en" ? "es" : "en" }), "Switch language")}
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>{body}</ScrollView>
      {mode && <TabBar tabs={mode === "rider" ? RIDER_TABS : PARENT_TABS} active={tab} onChange={setTab} />}
      <Footer lang={lang} />
      <SafeAreaView style={{ backgroundColor: c.card }} />
    </View>
  );
}
