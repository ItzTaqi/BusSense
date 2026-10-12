import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Btn } from "../components/Ui";
import { radius, useTheme } from "../theme";

// Minimal home page: one idea, two choices, one quiet link. Everything centered.
export function Welcome({ onRider, onParent, onDemo }: { onRider: () => void; onParent: () => void; onDemo: () => void }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, padding: 28, justifyContent: "space-between", alignItems: "stretch" }}>
      <View style={{ gap: 18, marginTop: 48, alignItems: "center" }}>
        <View accessible={false} style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bus" size={34} color={c.onBrand} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 36, fontWeight: "700", letterSpacing: -1.2, lineHeight: 40, textAlign: "center", color: c.ink }}>
          Where&apos;s the bus?
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, textAlign: "center", color: c.sub }}>
          Families see the real bus, even on substitute days. No device on the bus. No one tracked.
        </Text>
      </View>
      <View style={{ gap: 12, marginBottom: 12 }}>
        <Btn primary icon="bus" label="I ride the bus" onPress={onRider} />
        <Btn icon="people" label="I'm a parent" onPress={onParent} />
        <Pressable accessibilityRole="button" accessibilityLabel="Try the demo" onPress={onDemo}
          style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.primary }}>Try the demo</Text>
        </Pressable>
        <Text style={{ fontSize: 12, textAlign: "center", color: c.sub }}>A bus is shown only when 3+ riders are on it.</Text>
      </View>
    </View>
  );
}
