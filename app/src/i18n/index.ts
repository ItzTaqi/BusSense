import en from "./en.json";
import es from "./es.json";

export type Lang = "en" | "es";
const tables: Record<Lang, Record<string, string>> = { en, es };

export function t(key: string, lang: Lang = "en"): string {
  return tables[lang][key] ?? tables.en[key] ?? key;
}
