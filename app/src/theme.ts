import { useColorScheme } from "react-native";

// GoYellow design tokens: white surfaces, blue accent (plus one red for destructive actions).
// Status is never color: it is icon + text + fill style. See /design/DESIGN.md.
const light = {
  mode: "light" as "light" | "dark",
  bg: "#FFFFFF", card: "#FFFFFF", cardAlt: "#F1F6FF", ink: "#0B1220", sub: "#5B6B8C", line: "#DCE6F7",
  brand: "#1F6BFF", onBrand: "#FFFFFF", primary: "#1F6BFF", onPrimary: "#FFFFFF",
  danger: "#C62145", shadow: "#1F6BFF", heroA: "#1F6BFF", heroB: "#0B3FBF",
};
const dark: typeof light = {
  mode: "dark",
  bg: "#0A1020", card: "#121A33", cardAlt: "#1A2547", ink: "#F2F6FF", sub: "#9DB0DC", line: "#26335C",
  brand: "#4D8DFF", onBrand: "#06122B", primary: "#4D8DFF", onPrimary: "#06122B",
  danger: "#FF7B94", shadow: "#000000", heroA: "#1747B8", heroB: "#0B2A73",
};
export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === "dark" ? dark : light);

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };
export const type = { body: 16, label: 13, title: 22, hero: 56 };
export const radius = 16;

// Heroes are always dark, so their content is always white.
export const onHero = { fg: "#FFFFFF", dim: "rgba(255,255,255,0.78)", faint: "rgba(255,255,255,0.22)" };

export type Source = "LIVE" | "RECENT" | "ESTIMATE" | "NO DATA";
// Source look = icon + text + fill style (solid / outline / dashed / faint), never hue alone.
export function sourceStyle(s: string, onDark: boolean) {
  const solid = onDark ? "#FFFFFF" : "#1F6BFF";
  const inverse = onDark ? "#0B3FBF" : "#FFFFFF";
  switch (s) {
    case "LIVE": return { fg: inverse, bg: solid, border: solid, dash: false, icon: "radio" as const };
    case "RECENT": return { fg: solid, bg: "transparent", border: solid, dash: false, icon: "time" as const };
    case "ESTIMATE": return { fg: solid, bg: "transparent", border: solid, dash: true, icon: "analytics" as const };
    default: return { fg: solid, bg: onDark ? "rgba(255,255,255,0.16)" : "#F1F6FF", border: "transparent", dash: false, icon: "help-circle" as const };
  }
}
