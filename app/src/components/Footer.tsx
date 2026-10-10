import { Text, View } from "react-native";
import { t, Lang } from "../i18n";

export function Footer({ lang = "en" }: { lang?: Lang }) {
  return (
    <View accessible accessibilityRole="text" style={{ padding: 12 }}>
      <Text style={{ fontSize: 14, textAlign: "center" }}>{t("footer", lang)}</Text>
    </View>
  );
}
