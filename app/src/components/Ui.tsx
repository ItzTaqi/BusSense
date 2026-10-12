import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, Text, TextInput, TextInputProps, View } from "react-native";
import { radius, sourceStyle, space, type, useTheme, Theme } from "../theme";

export type IconName = keyof typeof Ionicons.glyphMap;

export const Screen = ({ children }: { children: ReactNode }) => (
  <View style={{ flex: 1, padding: space.md, gap: 14, alignItems: "stretch" }}>{children}</View>
);

export const H = ({ children, color }: { children: ReactNode; color?: string }) => {
  const c = useTheme();
  return <Text accessibilityRole="header" style={{ fontSize: type.title, fontWeight: "700", letterSpacing: -0.4, textAlign: "center", color: color ?? c.ink }}>{children}</Text>;
};

export const P = ({ children, dim, color }: { children: ReactNode; dim?: boolean; color?: string }) => {
  const c = useTheme();
  return <Text style={{ fontSize: type.body, lineHeight: 22, textAlign: "center", color: color ?? (dim ? c.sub : c.ink) }}>{children}</Text>;
};

export const IconBubble = ({ name, color, bg, size = 36 }: { name: IconName; color?: string; bg?: string; size?: number }) => {
  const c = useTheme();
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.cardAlt, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={name} size={size * 0.52} color={color ?? c.primary} />
    </View>
  );
};

export const Card = ({ children, tone, icon, title }: { children?: ReactNode; tone?: "brand" | "alt"; icon?: IconName; title?: string }) => {
  const c = useTheme();
  const bg = tone === "brand" ? c.brand : tone === "alt" ? c.cardAlt : c.card;
  const fg = tone === "brand" ? c.onBrand : c.ink;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius + 2, padding: space.md, gap: space.sm, alignItems: "stretch",
      borderWidth: tone ? 0 : 1, borderColor: c.line }}>
      {(icon || title) && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {icon && <IconBubble name={icon} />}
          {title && <Text accessibilityRole="header" style={{ fontSize: type.body, fontWeight: "700", textAlign: "center", color: fg }}>{title}</Text>}
        </View>
      )}
      {children}
    </View>
  );
};

// Shared look for every text field: soft filled box, no hard outline, blue ring while focused.
export const fieldBox = (c: Theme, focused = false, disabled = false) => ({
  minHeight: 48, borderRadius: radius - 2, paddingHorizontal: 16, fontSize: type.body, color: c.ink,
  backgroundColor: c.cardAlt, borderWidth: 1.5, borderColor: focused ? c.primary : "transparent", opacity: disabled ? 0.5 : 1,
});

export const Input = (props: TextInputProps) => {
  const c = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput placeholderTextColor={c.sub} {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={[fieldBox(c, focused), { textAlign: "center" }, Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null, props.style]} />
  );
};

export const Btn = ({ label, onPress, danger, disabled, primary, icon }: {
  label: string; onPress: () => void; danger?: boolean; disabled?: boolean; primary?: boolean; icon?: IconName }) => {
  const c = useTheme();
  const fg = primary ? c.onBrand : danger ? c.danger : c.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 50, borderRadius: radius - 2, paddingHorizontal: space.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: primary ? c.brand : c.cardAlt, opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
        })}>
      {icon && <Ionicons name={icon} size={20} color={fg} />}
      <Text style={{ fontSize: type.body, fontWeight: "700", color: fg }}>{label}</Text>
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
    <View accessible={false} style={{ width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
      {!reduce && <Animated.View style={{ position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }} />}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
};

// Source badge: icon + TEXT + fill style (solid / outline / dashed / faint). Never hue alone.
export const Badge = ({ text, onDark = true }: { text: string; onDark?: boolean }) => {
  const s = sourceStyle(text, onDark);
  return (
    <View accessible accessibilityLabel={`Data source: ${text}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
        backgroundColor: s.bg, borderWidth: 1.5, borderColor: s.border, borderStyle: s.dash ? "dashed" : "solid" }}>
      {text === "LIVE" ? <PulseDot color={s.fg} /> : <Ionicons name={s.icon} size={15} color={s.fg} />}
      <Text style={{ fontSize: type.label, fontWeight: "700", letterSpacing: 0.8, color: s.fg }}>{text}</Text>
    </View>
  );
};

export const Hero = ({ children, icon }: { children: ReactNode; icon?: IconName }) => {
  const c = useTheme();
  return (
    <LinearGradient colors={[c.heroA, c.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ borderRadius: radius + 10, padding: space.lg, gap: space.sm, overflow: "hidden", alignItems: "center" }}>
      {children}
    </LinearGradient>
  );
};

export const ProgressBar = ({ step, total }: { step: number; total: number }) => {
  const c = useTheme();
  return (
    <View accessible accessibilityLabel={`Step ${step} of ${total}`} style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? c.brand : c.line }} />
      ))}
    </View>
  );
};
