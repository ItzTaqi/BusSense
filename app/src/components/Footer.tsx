import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t, Lang } from "../i18n";
import { useTheme } from "../theme";

// The footer also owns the bottom safe-area inset (home indicator), so there is exactly one bottom strip,
// the same color as the tab bar above it.
export function Footer({ lang = "en" }: { lang?: Lang }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessible accessibilityRole="text" style={{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 10 + insets.bottom, backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line }}>
      <Text style={{ fontSize: 12, textAlign: "center", color: c.sub }}>{t("footer", lang)}</Text>
    </View>
  );
}
