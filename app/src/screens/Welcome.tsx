import { Ionicons } from "@expo/vector-icons";
import { PlusJakartaSans_500Medium, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useTheme } from "../theme";

// First screen: just the name and the tagline, centered, plus the one button needed to continue.
export function Welcome({ onStart }: { onStart: () => void }) {
  const c = useTheme();
  // Plus Jakarta Sans for the home page only. Custom fonts carry their own weight, so no fontWeight here.
  const [loaded] = useFonts({ PlusJakartaSans_500Medium, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const f = { m: "PlusJakartaSans_500Medium", b: "PlusJakartaSans_700Bold", x: "PlusJakartaSans_800ExtraBold" };
  if (!loaded) return <LinearGradient colors={[c.heroA, c.heroB]} style={{ flex: 1 }} />; // same background, no font flash
  return (
    <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
            <Text accessibilityRole="header" style={{ fontSize: 64, fontFamily: f.x, letterSpacing: -2.5, color: "#FFFFFF" }}>GoNC</Text>
            <View style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, backgroundColor: "#FFFFFF" }}>
              <Text style={{ fontSize: 14, fontFamily: f.x, letterSpacing: 0.3, color: "#061A66" }}>Powered by riders · Just for riders</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Get started" onPress={onStart}
            style={({ pressed }) => ({ minHeight: 52, borderRadius: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <Text style={{ fontSize: 16, fontFamily: f.x, color: "#061A66" }}>Get started</Text>
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
