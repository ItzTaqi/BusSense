import { useColorScheme } from "react-native";

const light = {
  bg: "#FFF9E6", card: "#FFFFFF", ink: "#1A1A1A", sub: "#4A4A4A", line: "#D9CFA8",
  brand: "#FFC20E", onBrand: "#1A1A1A", danger: "#B3261E", ok: "#1B6E3A",
};
const dark: typeof light = {
  bg: "#12110A", card: "#1F1D12", ink: "#FFF6D6", sub: "#C9C29E", line: "#4A4526",
  brand: "#FFC20E", onBrand: "#1A1A1A", danger: "#FF8A80", ok: "#7DDC9B",
};
export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === "dark" ? dark : light);

export const space = { xs: 6, sm: 10, md: 16, lg: 24 };
export const type = { body: 18, label: 16, title: 26, hero: 56 };
export const radius = 14;
