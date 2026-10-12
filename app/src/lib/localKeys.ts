// Every key GoNC stores on the phone. Deleting an account removes all of them.
export const KEYS = {
  children: "gonc.children.v1",
  appearance: "gonc.appearance.v1",
  terms: "gonc.terms.v1",
  alertPrefs: "gonc.alertprefs.v1",
  rides: "gonc.rides.v1",
} as const;
export const ALL_LOCAL_KEYS: string[] = Object.values(KEYS);
