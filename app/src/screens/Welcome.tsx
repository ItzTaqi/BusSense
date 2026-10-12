import { Ionicons } from "@expo/vector-icons";
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
  return (
    <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 22, gap: 18, justifyContent: "space-between" }}>
          <View style={{ gap: 14, alignItems: "center", paddingTop: 10 }}>
            <View accessible={false} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bus" size={26} color="#061A66" />
              </View>
              <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: "800", letterSpacing: -1, color: "#FFFFFF" }}>GoNC</Text>
            </View>
            <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#FFFFFF" }}>
              <Text style={{ fontSize: 13, fontWeight: "800", letterSpacing: 0.3, color: "#061A66" }}>Powered by riders · Just for riders</Text>
            </View>
            <Text style={{ fontSize: 28, lineHeight: 33, fontWeight: "800", letterSpacing: -0.8, textAlign: "center", color: "#FFFFFF", marginTop: 4 }}>
              Know where your school bus really is.
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: "500", textAlign: "center", color: "#FFFFFF", maxWidth: 330 }}>
              GoNC shows your bus on substitute days, late buses and when the official tracker goes quiet. Riders share their bus
              anonymously, and everyone sees one anonymous bus.
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {FEATURES.map((f) => (
              <View key={f.title} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "#FFFFFF" }}>
                <View accessible={false} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#E4ECFF", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={f.icon} size={20} color="#0F46E6" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#050A1A" }}>{f.title}</Text>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: "#2B3553" }}>{f.text}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Get started" onPress={onStart}
            style={({ pressed }) => ({ minHeight: 52, borderRadius: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#061A66" }}>Get started</Text>
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
