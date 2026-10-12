import { useColorScheme } from "react-native";
import { resolveScheme } from "./lib/appearance";
import { useApp } from "./state/store";

// GoNC design tokens: white surfaces, blue accent (plus one red for destructive actions).
// Status is never color: it is icon + text + fill style. See /design/DESIGN.md.
const light = {
  mode: "light" as "light" | "dark",
  bg: "#FFFFFF", card: "#FFFFFF", cardAlt: "#EAF0FF", ink: "#050A1A", sub: "#3B4766", line: "#C3D1F2",
  brand: "#0F46E6", onBrand: "#FFFFFF", primary: "#0F46E6", onPrimary: "#FFFFFF",
  danger: "#B3123A", shadow: "#0F46E6", heroA: "#061A66", heroB: "#0F46E6",
};
const dark: typeof light = {
  mode: "dark",
  bg: "#04070F", card: "#0C1330", cardAlt: "#16224F", ink: "#FFFFFF", sub: "#C0CCF2", line: "#2B3D78",
  brand: "#6B96FF", onBrand: "#03102E", primary: "#6B96FF", onPrimary: "#03102E",
  danger: "#FF8FA6", shadow: "#000000", heroA: "#0B1F73", heroB: "#2F5FFF",
};
export type Theme = typeof light;
// Follows the device unless the person picked Light or Dark in Settings.
export const useTheme = (): Theme => {
  const system = useColorScheme();
  const pref = useApp((s) => s.appearance);
  return resolveScheme(pref, system) === "dark" ? dark : light;
};

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };
export const type = { body: 16, label: 13, title: 22, hero: 56 };
export const radius = 16;

// Heroes are always dark, so their content is always white.
export const onHero = { fg: "#FFFFFF", dim: "rgba(255,255,255,0.78)", faint: "rgba(255,255,255,0.22)" };

export type Source = "LIVE" | "RECENT" | "ESTIMATE" | "NO DATA";
// Source look = icon + text + fill style (solid / outline / dashed / faint), never hue alone.
export function sourceStyle(s: string, onDark: boolean) {
  const solid = onDark ? "#FFFFFF" : "#0F46E6";
  const inverse = onDark ? "#061A66" : "#FFFFFF";
  switch (s) {
    case "LIVE": return { fg: inverse, bg: solid, border: solid, dash: false, icon: "radio" as const };
    case "RECENT": return { fg: solid, bg: "transparent", border: solid, dash: false, icon: "time" as const };
    case "ESTIMATE": return { fg: solid, bg: "transparent", border: solid, dash: true, icon: "analytics" as const };
    default: return { fg: solid, bg: onDark ? "rgba(255,255,255,0.16)" : "#F1F6FF", border: "transparent", dash: false, icon: "help-circle" as const };
  }
}
