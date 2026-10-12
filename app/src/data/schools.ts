import data from "./schools.json";

// Schools per Wake County city, from OpenStreetMap (ODbL). Incomplete: the picker also offers "My school isn't listed".
const raw = data as Record<string, string[]>;

export const CITIES = Object.keys(raw).sort();

const rank = (n: string) => (/high/i.test(n) ? 0 : /middle|junior/i.test(n) ? 1 : /elementary|primary/i.test(n) ? 3 : 2);

/** High schools first, then middle, other, elementary; alphabetical inside each group. */
export function schoolsIn(city: string): string[] {
  return [...(raw[city] ?? [])].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
