import { Ionicons } from "@expo/vector-icons";
import { PlusJakartaSans_500Medium, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useTheme } from "../theme";

// First screen: blue gradient with strong white headings; each feature sits on a white card so the text stands out.
const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: "radio", title: "See your bus", text: "Live position when riders are on it, honestly labeled when it is only an estimate." },
  { icon: "walk", title: "Know when to leave", text: "A leave-by time and alerts, even on substitute-bus days." },
  { icon: "shield-checkmark", title: "Private by design", text: "A bus shows only when 3+ riders share it. No names, ever." },
];

export function Welcome({ onStart }: { onStart: () => void }) {
  const c = useTheme();
  // Plus Jakarta Sans for the home page only. Custom fonts carry their own weight, so no fontWeight here.
  const [loaded] = useFonts({ PlusJakartaSans_500Medium, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const f = { m: "PlusJakartaSans_500Medium", b: "PlusJakartaSans_700Bold", x: "PlusJakartaSans_800ExtraBold" };
  if (!loaded) return <LinearGradient colors={[c.heroA, c.heroB]} style={{ flex: 1 }} />; // same background, no font flash
  return (
    <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 22, gap: 18, justifyContent: "space-between" }}>
          <View style={{ gap: 14, alignItems: "center", paddingTop: 10 }}>
            <View accessible={false} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bus" size={26} color="#061A66" />
              </View>
              <Text accessibilityRole="header" style={{ fontSize: 30, fontFamily: f.x, letterSpacing: -1, color: "#FFFFFF" }}>GoNC</Text>
            </View>
            <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#FFFFFF" }}>
              <Text style={{ fontSize: 13, fontFamily: f.x, letterSpacing: 0.3, color: "#061A66" }}>Powered by riders · Just for riders</Text>
            </View>
            <Text style={{ fontSize: 18, lineHeight: 26, fontFamily: f.b, letterSpacing: -0.2, textAlign: "center", color: "#FFFFFF", maxWidth: 350, marginTop: 6 }}>
              Official trackers can miss substitute, activity and late buses. GoNC fills the gap.
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 22, fontFamily: f.m, textAlign: "center", color: "#FFFFFF", maxWidth: 340 }}>
              Riders share their bus anonymously, so when 3 or more are aboard, everyone can see where it is. No bus hardware needed.
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {FEATURES.map((ft) => (
              <View key={ft.title} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "#FFFFFF" }}>
                <View accessible={false} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#E4ECFF", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={ft.icon} size={20} color="#0F46E6" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, fontFamily: f.x, color: "#050A1A" }}>{ft.title}</Text>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: "#2B3553" }}>{ft.text}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Get started" onPress={onStart}
            style={({ pressed }) => ({ minHeight: 52, borderRadius: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <Text style={{ fontSize: 16, fontFamily: f.x, color: "#061A66" }}>Get started</Text>
            <Ionicons name="arrow-forward" size={18} color="#061A66" />
          </Pressable>
        </ScrollView>
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
