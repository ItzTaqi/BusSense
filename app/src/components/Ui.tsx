import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text, View } from "react-native";
import { radius, sourceStyle, space, type, useTheme } from "../theme";

export type IconName = keyof typeof Ionicons.glyphMap;

export const Screen = ({ children }: { children: ReactNode }) => (
  <View style={{ flex: 1, padding: space.md, gap: space.md, alignItems: "stretch" }}>{children}</View>
);

export const H = ({ children, color }: { children: ReactNode; color?: string }) => {
  const c = useTheme();
  return <Text accessibilityRole="header" style={{ fontSize: type.title, fontWeight: "900", letterSpacing: -0.5, textAlign: "center", color: color ?? c.ink }}>{children}</Text>;
};

export const P = ({ children, dim, color }: { children: ReactNode; dim?: boolean; color?: string }) => {
  const c = useTheme();
  return <Text style={{ fontSize: type.body, lineHeight: 26, textAlign: "center", color: color ?? (dim ? c.sub : c.ink) }}>{children}</Text>;
};

export const IconBubble = ({ name, color, bg, size = 44 }: { name: IconName; color?: string; bg?: string; size?: number }) => {
  const c = useTheme();
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.cardAlt, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={name} size={size * 0.52} color={color ?? c.ink} />
    </View>
  );
};

export const Card = ({ children, tone, icon, title }: { children?: ReactNode; tone?: "brand" | "alt"; icon?: IconName; title?: string }) => {
  const c = useTheme();
  const bg = tone === "brand" ? c.brand : tone === "alt" ? c.cardAlt : c.card;
  const fg = tone === "brand" ? c.onBrand : c.ink;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius, padding: space.md, gap: space.sm, alignItems: "stretch", borderWidth: 1, borderColor: c.line,
      shadowColor: c.shadow, shadowOpacity: c.mode === "dark" ? 0.4 : 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
      {(icon || title) && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm }}>
          {icon && <IconBubble name={icon} />}
          {title && <Text accessibilityRole="header" style={{ fontSize: type.body + 1, fontWeight: "800", textAlign: "center", color: fg }}>{title}</Text>}
        </View>
      )}
      {children}
    </View>
  );
};

export const Btn = ({ label, onPress, danger, disabled, primary, icon }: {
  label: string; onPress: () => void; danger?: boolean; disabled?: boolean; primary?: boolean; icon?: IconName }) => {
  const c = useTheme();
  const fg = primary ? c.onBrand : danger ? c.danger : c.ink;
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 58, paddingHorizontal: space.md }}>
      {icon && <Ionicons name={icon} size={24} color={fg} />}
      <Text style={{ fontSize: type.body + 2, fontWeight: "800", color: fg }}>{label}</Text>
    </View>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ borderRadius: radius, overflow: "hidden", opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
        borderWidth: 2, borderColor: primary ? c.brand : danger ? c.danger : c.ink, backgroundColor: primary ? c.brand : c.card })}>
      {inner}
    </Pressable>
  );
};

// Pulsing dot for LIVE. Respects the system "reduce motion" setting.
export const PulseDot = ({ color }: { color: string }) => {
  const v = useRef(new Animated.Value(0)).current;
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce); }, []);
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce, v]);
  return (
    <View accessible={false} style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
      {!reduce && <Animated.View style={{ position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }} />}
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
};

// Source badge: icon + TEXT + fill style (solid / outline / dashed / faint). Never hue.
export const Badge = ({ text, onDark = true }: { text: string; onDark?: boolean }) => {
  const s = sourceStyle(text, onDark);
  return (
    <View accessible accessibilityLabel={`Data source: ${text}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
        backgroundColor: s.bg, borderWidth: 2, borderColor: s.border, borderStyle: s.dash ? "dashed" : "solid" }}>
      {text === "LIVE" ? <PulseDot color={s.fg} /> : <Ionicons name={s.icon} size={18} color={s.fg} />}
      <Text style={{ fontSize: type.label, fontWeight: "900", letterSpacing: 1, color: s.fg }}>{text}</Text>
    </View>
  );
};

export const Hero = ({ children, icon }: { children: ReactNode; icon?: IconName }) => {
  const c = useTheme();
  return (
    <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ borderRadius: radius + 8, padding: space.lg, gap: space.sm, overflow: "hidden", alignItems: "center" }}>
      {icon && <Ionicons name={icon} size={150} color="rgba(255,255,255,0.07)" style={{ position: "absolute", right: -20, top: -10 }} />}
      {children}
    </LinearGradient>
  );
};

export const ProgressBar = ({ step, total }: { step: number; total: number }) => {
  const c = useTheme();
  return (
    <View accessible accessibilityLabel={`Step ${step} of ${total}`} style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < step ? c.ink : c.line }} />
      ))}
    </View>
  );
};
