import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Btn } from "../components/Ui";
import { palette, radius, useTheme } from "../theme";

// Minimal home page: one idea, two choices, one quiet link.
export function Welcome({ onRider, onParent, onDemo }: { onRider: () => void; onParent: () => void; onDemo: () => void }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, padding: 28, justifyContent: "space-between" }}>
      <View style={{ gap: 28, marginTop: 40 }}>
        <View accessible={false} style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: palette.sun, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bus" size={40} color={palette.navy} />
        </View>
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={{ fontSize: 48, fontWeight: "900", letterSpacing: -2, lineHeight: 52, color: c.ink }}>
            Where&apos;s the bus?
          </Text>
          <Text style={{ fontSize: 20, lineHeight: 28, color: c.sub }}>
            Families see the real bus, even on substitute days. No device on the bus. No one tracked.
          </Text>
        </View>
      </View>
      <View style={{ gap: 12, marginBottom: 12 }}>
        <Btn primary icon="bus" label="I ride the bus" onPress={onRider} />
        <Btn icon="people" label="I'm a parent" onPress={onParent} />
        <Pressable accessibilityRole="button" accessibilityLabel="Try the demo" onPress={onDemo}
          style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: c.primary }}>Try the demo →</Text>
        </Pressable>
        <Text style={{ fontSize: 14, textAlign: "center", color: c.sub }}>
          A bus is shown only when 3+ riders are on it.
        </Text>
      </View>
    </View>
  );
}
