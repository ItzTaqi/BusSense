import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from "react-native";
import { Footer } from "./src/components/Footer";
import { TabBar, type Tab } from "./src/components/TabBar";
import { ensureAnonSession } from "./src/lib/supabase";
import { Onboarding } from "./src/screens/Onboarding";
import { Parent } from "./src/screens/Parent";
import { RiderHome } from "./src/screens/RiderHome";
import { Settings, type SettingsPage } from "./src/screens/Settings";
import { Welcome } from "./src/screens/Welcome";
import { useApp } from "./src/state/store";
import { useTheme } from "./src/theme";

// Each person only sees their own role's tabs (chosen on the first screen).
const RIDER_TABS: Tab[] = [
  { key: "home", label: "Ride", icon: "bus" },
  { key: "settings", label: "Settings", icon: "settings" },
];
const PARENT_TABS: Tab[] = [
  { key: "board", label: "Stop board", icon: "location" },
  { key: "alerts", label: "Alerts", icon: "notifications" },
  { key: "report", label: "Report card", icon: "stats-chart" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export default function App() {
  const { mode, demo, set } = useApp();
  const c = useTheme();
  const [tab, setTab] = useState("home");
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("");
  const [onboarding, setOnboarding] = useState(false);
  useEffect(() => { ensureAnonSession().catch(() => {}); }, []);

  const go = (s: string) => {
    if (s === "receipt" || s === "privacy" || s === "record") { setSettingsPage(s); setTab("settings"); }
    else setTab(s);
  };
  const changeTab = (k: string) => { if (k === "settings") setSettingsPage(""); setTab(k); };
  const welcome = !mode && !onboarding;

  let body: React.ReactNode;
  if (demo) body = <Parent key="demo" tab="board" />;
  else if (welcome) body = <Welcome onRider={() => setOnboarding(true)} onParent={() => { set({ mode: "parent" }); setTab("board"); }} />;
  else if (!mode) body = <Onboarding />;
  else if (tab === "settings") body = <Settings page={settingsPage} setPage={setSettingsPage} />;
  else if (mode === "parent") body = <Parent key="real" tab={tab} />;
  else body = <RiderHome go={go} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar barStyle="light-content" />
      {!welcome && (
        <View style={{ backgroundColor: c.heroA }}>
          <SafeAreaView>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 }}>
              <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bus" size={16} color="#061A66" />
              </View>
              <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.2 }}>GoYellow</Text>
            </View>
          </SafeAreaView>
        </View>
      )}
      {demo && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.cardAlt }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.ink }}>Demo · sample data, not real</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Exit demo" onPress={() => set({ demo: false })} style={{ minHeight: 36, justifyContent: "center", paddingHorizontal: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.primary }}>Exit demo</Text>
          </Pressable>
        </View>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>{body}</ScrollView>
      {mode && !demo && <TabBar tabs={mode === "rider" ? RIDER_TABS : PARENT_TABS} active={tab} onChange={changeTab} />}
      <Footer />
      <SafeAreaView style={{ backgroundColor: c.card }} />
    </View>
  );
}
