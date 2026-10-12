import { Text, View } from "react-native";
import { t, Lang } from "../i18n";
import { useTheme } from "../theme";

export function Footer({ lang = "en" }: { lang?: Lang }) {
  const c = useTheme();
  return (
    <View accessible accessibilityRole="text" style={{ padding: 12, backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line }}>
      <Text style={{ fontSize: 14, textAlign: "center", color: c.sub }}>{t("footer", lang)}</Text>
    </View>
  );
}
