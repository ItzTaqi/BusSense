import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useTheme } from "../theme";

// First screen: high-contrast blue panel, the app name, one clear line, one clear start button.
export function Welcome({ onStart }: { onStart: () => void }) {
  const c = useTheme();
  return (
    <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: "space-between" }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
            <View accessible={false} style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="bus" size={34} color="#061A66" />
            </View>
            <Text accessibilityRole="header" style={{ fontSize: 34, fontWeight: "800", letterSpacing: -1.2, color: "#FFFFFF" }}>GoNC</Text>
            <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: "600", textAlign: "center", color: "rgba(255,255,255,0.95)", maxWidth: 320 }}>
              Powered by riders · Just for riders
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Get started" onPress={onStart}
            style={({ pressed }) => ({ minHeight: 50, borderRadius: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#061A66" }}>Get started</Text>
            <Ionicons name="arrow-forward" size={18} color="#061A66" />
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Second screen: who is using the app. The answer decides which tabs the person sees.
export function RoleSelect({ onRider, onParent, onBack }: { onRider: () => void; onParent: () => void; onBack: () => void }) {
  const c = useTheme();
  const option = (icon: keyof typeof Ionicons.glyphMap, title: string, sub: string, onPress: () => void, solid: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} onPress={onPress}
      style={({ pressed }) => ({ borderRadius: 18, padding: 18, gap: 6, alignItems: "center", backgroundColor: solid ? c.brand : c.cardAlt, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <Ionicons name={icon} size={30} color={solid ? c.onBrand : c.primary} />
      <Text style={{ fontSize: 18, fontWeight: "800", color: solid ? c.onBrand : c.ink }}>{title}</Text>
      <Text style={{ fontSize: 13, textAlign: "center", color: solid ? "rgba(255,255,255,0.85)" : c.sub }}>{sub}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, padding: 24, gap: 14, justifyContent: "center" }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "800", textAlign: "center", color: c.ink }}>Who is using GoNC?</Text>
      <Text style={{ fontSize: 14, textAlign: "center", color: c.sub }}>You will only see what is useful for you.</Text>
      {option("bus", "I ride the bus", "Share your bus so others can see it. Ages 13+.", onRider, true)}
      {option("people", "I'm a parent", "Follow your child's bus to your stop.", onParent, false)}
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>Back</Text>
      </Pressable>
    </View>
  );
}
