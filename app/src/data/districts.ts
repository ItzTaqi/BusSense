// Here Comes the Bus (Synovia) district codes for NC districts, as published on district/vendor pages (see docs/DISTRICT_CODES.md).
// Each district sets its own code; a code identifies the DISTRICT's tracking system, not a bus.
// Verify with the district's transportation office before relying on one. Anything missing -> "Other district".
export interface District { name: string; code: string }

export const DISTRICTS: District[] = [
  { name: "Wake County (yellow bus)", code: "67500" },
  { name: "Wake County (vendor bus)", code: "67501" },
  { name: "Charlotte-Mecklenburg", code: "73877" },
  { name: "Johnston County", code: "76361" },
  { name: "Granville County", code: "82346" },
  { name: "Bladen County", code: "75971" },
  { name: "Wilson County", code: "13509" },
];

export const isDistrictCode = (s: string) => /^\d{5}$/.test(s.trim());
export const districtLabel = (d: District) => `${d.name} · ${d.code}`;
export const districtByLabel = (label: string) => DISTRICTS.find((d) => districtLabel(d) === label);

// Wake County cities default to the WCPSS yellow-bus code.
export const WAKE_CITIES = ["Apex", "Cary", "Fuquay-Varina", "Garner", "Holly Springs", "Knightdale", "Morrisville", "Raleigh", "Rolesville", "Wake Forest", "Wendell", "Zebulon"];
export const defaultDistrictForCity = (city: string): District | undefined => (WAKE_CITIES.includes(city) ? DISTRICTS[0] : undefined);
