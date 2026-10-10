// Pure helpers for the stop board.
export function leaveByMinutes(etaLo: number | null, walkMin: number): number | null {
  return etaLo === null ? null : Math.max(0, Math.floor(etaLo - walkMin - 2));
}
export const sourceLabel = (s: string) =>
  ({ LIVE: "LIVE", RECENT: "RECENT", ESTIMATE: "ESTIMATE", NO_DATA: "NO DATA" } as Record<string, string>)[s] ?? "NO DATA";
