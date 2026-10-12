// Appearance preference: follow the phone ("system") or force light/dark.
export type Appearance = "system" | "light" | "dark";
export const APPEARANCES: Appearance[] = ["system", "light", "dark"];

export const isAppearance = (v: unknown): v is Appearance => typeof v === "string" && (APPEARANCES as string[]).includes(v);

/** The scheme to draw with. `system` follows the device and falls back to light if the device doesn't say. */
export function resolveScheme(pref: Appearance, system: string | null | undefined): "light" | "dark" {
  return pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
}
