import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from "react-native";
import { Footer } from "./src/components/Footer";
import { t } from "./src/i18n";
import { ensureAnonSession } from "./src/lib/supabase";
import { Onboarding } from "./src/screens/Onboarding";
import { Parent } from "./src/screens/Parent";
import { Privacy } from "./src/screens/Privacy";
import { Receipt } from "./src/screens/Receipt";
import { Record } from "./src/screens/Record";
import { RiderHome } from "./src/screens/RiderHome";
import { useApp } from "./src/state/store";
import { radius, useTheme } from "./src/theme";

export default function App() {
  const { mode, lang, demo, set } = useApp();
  const c = useTheme();
  const [screen, setScreen] = useState("home");
  useEffect(() => { ensureAnonSession().catch(() => {}); }, []);

  let body = <Onboarding />;
  if (mode === "parent") body = <Parent />;
  if (mode === "rider") {
    body = screen === "privacy" ? <Privacy /> : screen === "receipt" ? <Receipt />
      : screen === "record" ? <Record /> : <RiderHome go={setScreen} />;
  }
  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius,
        backgroundColor: on ? c.brand : "transparent", borderWidth: 2, borderColor: on ? c.brand : c.line }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: on ? c.onBrand : c.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar barStyle={c.bg === "#12110A" ? "light-content" : "dark-content"} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "900", color: c.ink }}>🚌 GoYellow</Text>
      </View>
      {mode && (
        <View style={{ flexDirection: "row", gap: 8, padding: 12, flexWrap: "wrap" }}>
          {(["rider", "parent"] as const).map((m) => chip(t(`mode.${m}`, lang), mode === m, () => { set({ mode: m }); setScreen("home"); }))}
          {chip(`Demo ${demo ? "ON" : "OFF"}`, demo, () => set({ demo: !demo, mode: "parent" }))}
          {chip(lang === "en" ? "ES" : "EN", false, () => set({ lang: lang === "en" ? "es" : "en" }))}
        </View>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>{body}</ScrollView>
      <Footer lang={lang} />
    </SafeAreaView>
  );
}
