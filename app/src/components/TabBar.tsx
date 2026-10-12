import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { palette, useTheme } from "../theme";
import type { IconName } from "./Ui";

export interface Tab { key: string; label: string; icon: IconName }

export function TabBar({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (k: string) => void }) {
  const c = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line, paddingTop: 8, paddingBottom: 6 }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => onChange(t.key)}
            style={{ flex: 1, alignItems: "center", gap: 3, minHeight: 52 }}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 4, borderRadius: 999, backgroundColor: on ? palette.sun : "transparent" }}>
              <Ionicons name={on ? t.icon : (`${t.icon}-outline` as IconName)} size={24} color={on ? palette.navy : c.sub} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: on ? "900" : "600", color: on ? c.ink : c.sub }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
