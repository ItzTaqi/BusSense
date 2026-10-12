import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn } from "../components/Ui";
import { TermsContent } from "../components/TermsContent";
import { useTheme } from "../theme";

// Shown after "Get started". The person reads the terms, ticks the box, and only then can continue.
export function TermsAgreement({ onAgree, onBack }: { onAgree: () => void; onBack?: () => void }) {
  const c = useTheme();
  const [checked, setChecked] = useState(false);
  return (
    <View style={{ padding: 22, gap: 24 }}>
      {onBack && (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 40, alignSelf: "flex-start" }}>
          <Ionicons name="chevron-back" size={22} color={c.primary} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.primary }}>Back</Text>
        </Pressable>
      )}
      <TermsContent />
      <View style={{ gap: 14, paddingTop: 8 }}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel="I have read and agree to the Privacy and Terms" onPress={() => setChecked(!checked)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: c.cardAlt }}>
          <Ionicons name={checked ? "checkbox" : "square-outline"} size={26} color={checked ? c.primary : c.sub} />
          <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: c.ink }}>I have read and agree to the Privacy and Terms.</Text>
        </Pressable>
        <Btn primary label="Agree and continue" disabled={!checked} onPress={onAgree} />
      </View>
    </View>
  );
}
