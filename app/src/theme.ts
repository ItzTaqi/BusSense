import { useColorScheme } from "react-native";

// GoYellow design tokens: strictly black and white (plus one muted red for destructive actions).
// Status is never color: it is icon + text + fill style. See /design/DESIGN.md.
const light = {
  mode: "light" as "light" | "dark",
  bg: "#FFFFFF", card: "#FFFFFF", cardAlt: "#F2F2F2", ink: "#000000", sub: "#5A5A5A", line: "#D9D9D9",
  brand: "#000000", onBrand: "#FFFFFF", primary: "#000000", onPrimary: "#FFFFFF",
  danger: "#B00020", shadow: "#000000", heroA: "#000000", heroB: "#3A3A3A",
};
const dark: typeof light = {
  mode: "dark",
  bg: "#000000", card: "#121212", cardAlt: "#1E1E1E", ink: "#FFFFFF", sub: "#A8A8A8", line: "#2E2E2E",
  brand: "#FFFFFF", onBrand: "#000000", primary: "#FFFFFF", onPrimary: "#000000",
  danger: "#FF6B81", shadow: "#000000", heroA: "#1A1A1A", heroB: "#3D3D3D",
};
export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === "dark" ? dark : light);

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };
export const type = { body: 18, label: 16, title: 28, hero: 72 };
export const radius = 20;

// Heroes are always dark, so their content is always white.
export const onHero = { fg: "#FFFFFF", dim: "rgba(255,255,255,0.78)", faint: "rgba(255,255,255,0.22)" };

export type Source = "LIVE" | "RECENT" | "ESTIMATE" | "NO DATA";
// Source look = icon + text + fill style (solid / outline / dashed / faint), never hue.
export function sourceStyle(s: string, onDark: boolean) {
  const solid = onDark ? "#FFFFFF" : "#000000";
  const inverse = onDark ? "#000000" : "#FFFFFF";
  switch (s) {
    case "LIVE": return { fg: inverse, bg: solid, border: solid, dash: false, icon: "radio" as const };
    case "RECENT": return { fg: solid, bg: "transparent", border: solid, dash: false, icon: "time" as const };
    case "ESTIMATE": return { fg: solid, bg: "transparent", border: solid, dash: true, icon: "analytics" as const };
    default: return { fg: solid, bg: onDark ? "rgba(255,255,255,0.14)" : "#F2F2F2", border: "transparent", dash: false, icon: "help-circle" as const };
  }
}
