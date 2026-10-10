import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
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

export default function App() {
  const { mode, lang, demo, set } = useApp();
  const [screen, setScreen] = useState("home");
  useEffect(() => { ensureAnonSession().catch(() => {}); }, []);

  let body = <Onboarding />;
  if (mode === "parent") body = <Parent />;
  if (mode === "rider") {
    body = screen === "privacy" ? <Privacy /> : screen === "receipt" ? <Receipt />
      : screen === "record" ? <Record /> : <RiderHome go={setScreen} />;
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {mode && (
        <View style={{ flexDirection: "row", gap: 8, padding: 12, flexWrap: "wrap" }}>
          {(["rider", "parent"] as const).map((m) => (
            <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: mode === m }}
              onPress={() => { set({ mode: m }); setScreen("home"); }} style={{ padding: 10, borderWidth: mode === m ? 3 : 1 }}>
              <Text style={{ fontSize: 18 }}>{t(`mode.${m}`, lang)}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => set({ demo: !demo, mode: "parent" })} style={{ padding: 10, borderWidth: demo ? 3 : 1 }}>
            <Text style={{ fontSize: 18 }}>Demo mode {demo ? "ON" : "OFF"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => set({ lang: lang === "en" ? "es" : "en" })} style={{ padding: 10, borderWidth: 1 }}>
            <Text style={{ fontSize: 18 }}>{lang === "en" ? "ES" : "EN"}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView style={{ flex: 1 }}>{body}</ScrollView>
      <Footer lang={lang} />
    </SafeAreaView>
  );
}
