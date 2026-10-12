import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../theme";
import type { IconName } from "./Ui";

export interface Tab { key: string; label: string; icon: IconName }

export function TabBar({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (k: string) => void }) {
  const c = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line, paddingTop: 6, paddingBottom: 4 }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => onChange(t.key)}
            style={{ flex: 1, alignItems: "center", gap: 2, minHeight: 48 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999, backgroundColor: on ? c.cardAlt : "transparent" }}>
              <Ionicons name={on ? t.icon : (`${t.icon}-outline` as IconName)} size={22} color={on ? c.primary : c.sub} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: on ? "800" : "600", color: on ? c.primary : c.sub }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
