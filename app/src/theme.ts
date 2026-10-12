import { useColorScheme } from "react-native";

// GoYellow design tokens. See /design/DESIGN.md. Every status color is paired with an icon + text.
export const palette = {
  sun: "#FFD60A", sunDeep: "#FFB300", navy: "#0B1B3F", navy2: "#14275C", blue: "#2E6BFF",
  coral: "#FF4D6D", mint: "#14D6A0", violet: "#8B5CF6", amber: "#FF9F1C", white: "#FFFFFF",
};

const light = {
  mode: "light" as "light" | "dark",
  bg: "#F4F7FF", card: "#FFFFFF", cardAlt: "#EAF0FF", ink: "#0B1B3F", sub: "#53608A", line: "#D5DEF5",
  brand: palette.sun, onBrand: palette.navy, primary: palette.blue, onPrimary: "#FFFFFF",
  danger: "#D6234A", ok: "#0A9C77", warn: "#C26A00", info: "#2E6BFF", shadow: "#2E6BFF",
  heroA: palette.navy, heroB: "#2E6BFF", onHero: "#FFFFFF",
};
const dark: typeof light = {
  mode: "dark",
  bg: "#070F26", card: "#101D44", cardAlt: "#16275A", ink: "#F2F6FF", sub: "#A5B2DD", line: "#243564",
  brand: palette.sun, onBrand: palette.navy, primary: "#5C8DFF", onPrimary: "#FFFFFF",
  danger: "#FF7B94", ok: "#3DEBBE", warn: "#FFB74D", info: "#7DA2FF", shadow: "#000000",
  heroA: "#14275C", heroB: "#6D3FF0", onHero: "#FFFFFF",
};
export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === "dark" ? dark : light);

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };
export const type = { body: 18, label: 16, title: 28, hero: 72 };
export const radius = 20;

export type Source = "LIVE" | "RECENT" | "ESTIMATE" | "NO DATA";
export function sourceStyle(c: Theme, s: string) {
  switch (s) {
    case "LIVE": return { fg: c.onBrand, bg: palette.mint, icon: "radio" as const };
    case "RECENT": return { fg: c.onBrand, bg: palette.amber, icon: "time" as const };
    case "ESTIMATE": return { fg: "#FFFFFF", bg: palette.violet, icon: "analytics" as const };
    default: return { fg: c.ink, bg: c.cardAlt, icon: "help-circle" as const };
  }
}
