import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { radius, space, type, useTheme } from "../theme";

export const Screen = ({ children }: { children: ReactNode }) => {
  const c = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.bg, padding: space.md, gap: space.md }}>{children}</View>;
};

export const H = ({ children }: { children: ReactNode }) => {
  const c = useTheme();
  return <Text accessibilityRole="header" style={{ fontSize: type.title, fontWeight: "800", color: c.ink }}>{children}</Text>;
};

export const P = ({ children, dim }: { children: ReactNode; dim?: boolean }) => {
  const c = useTheme();
  return <Text style={{ fontSize: type.body, lineHeight: 26, color: dim ? c.sub : c.ink }}>{children}</Text>;
};

export const Card = ({ children, tone }: { children: ReactNode; tone?: "brand" }) => {
  const c = useTheme();
  return (
    <View style={{ backgroundColor: tone === "brand" ? c.brand : c.card, borderRadius: radius, padding: space.md,
      gap: space.sm, borderWidth: 1, borderColor: c.line }}>{children}</View>
  );
};

export const Btn = ({ label, onPress, danger, disabled, primary }: {
  label: string; onPress: () => void; danger?: boolean; disabled?: boolean; primary?: boolean }) => {
  const c = useTheme();
  const fill = primary ? c.brand : "transparent";
  const fg = primary ? c.onBrand : danger ? c.danger : c.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
      disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 56, justifyContent: "center", paddingHorizontal: space.md, borderRadius: radius,
        backgroundColor: fill, borderWidth: primary ? 0 : 2, borderColor: danger ? c.danger : c.line,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1 })}>
      <Text style={{ fontSize: type.body + 2, fontWeight: "700", textAlign: "center", color: fg }}>{label}</Text>
    </Pressable>
  );
};

// Source badge: always TEXT (plus a shape glyph), never color alone.
const GLYPH: Record<string, string> = { LIVE: "●", RECENT: "◐", ESTIMATE: "◇", "NO DATA": "○" };
export const Badge = ({ text }: { text: string }) => {
  const c = useTheme();
  return (
    <View accessible accessibilityLabel={`Data source: ${text}`}
      style={{ flexDirection: "row", gap: 6, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12,
        borderRadius: 999, borderWidth: 2, borderColor: c.ink, backgroundColor: text === "LIVE" ? c.brand : "transparent" }}>
      <Text style={{ fontSize: type.label, fontWeight: "800", color: text === "LIVE" ? c.onBrand : c.ink }}>
        {GLYPH[text] ?? "○"} {text}
      </Text>
    </View>
  );
};

export const Field = ({ children }: { children: ReactNode }) => <View style={{ gap: space.xs }}>{children}</View>;
