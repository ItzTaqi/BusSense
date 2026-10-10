import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export const H = ({ children }: { children: ReactNode }) => (
  <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "700" }}>{children}</Text>
);
export const P = ({ children }: { children: ReactNode }) => <Text style={{ fontSize: 18 }}>{children}</Text>;
export const Btn = ({ label, onPress, danger, disabled }: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={{ padding: 16, borderWidth: 2, borderRadius: 10, opacity: disabled ? 0.4 : 1, borderStyle: danger ? "dashed" : "solid" }}>
    <Text style={{ fontSize: 20, textAlign: "center" }}>{label}</Text>
  </Pressable>
);
export const Badge = ({ text }: { text: string }) => (
  <View accessible accessibilityLabel={`Data source: ${text}`} style={{ borderWidth: 2, padding: 6, alignSelf: "flex-start" }}>
    <Text style={{ fontSize: 18, fontWeight: "700" }}>{text}</Text>
  </View>
);
