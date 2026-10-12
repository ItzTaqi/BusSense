// District code -> bus number. Riders enter the code the district uses for their route; the bus number
// shown to families and used for matching is derived from it.
// ASSUMED FORMAT (change here if the real district format differs): letters/digits with optional dashes,
// at least one digit. The bus number is the LAST run of digits with leading zeros removed:
//   "H-0412" -> 412, "BUS 12" is rejected (spaces), "e7" -> 7.
export interface DistrictCode { code: string; bus: string }

export function parseDistrictCode(input: string): DistrictCode | null {
  const code = input.trim().toUpperCase();
  if (!/^[A-Z0-9-]{2,12}$/.test(code)) return null;
  const runs = code.match(/\d+/g);
  if (!runs) return null;
  const bus = runs[runs.length - 1].replace(/^0+(?=\d)/, "");
  if (bus === "0") return null;
  return { code, bus };
}
