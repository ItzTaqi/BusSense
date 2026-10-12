// Pure alert-rule logic (section 8) so it can be unit tested without push infrastructure.
export type Source = "LIVE" | "RECENT" | "ESTIMATE" | "NO_DATA";
export interface StatusRow { source: Source; eta_lo: number | null; ageMin: number }
export interface Prefs {
  walkMin: number; quietNow: boolean; lastPushMinAgoForStop: number | null; alreadySentLeaveNow: boolean;
}
export type Decision = { send: false } | { send: true; kind: string; text: string };

const blocked = (p: Pick<Prefs, "quietNow" | "lastPushMinAgoForStop">) =>
  p.quietNow || (p.lastPushMinAgoForStop !== null && p.lastPushMinAgoForStop < 5); // 1 push / stop / 5 min

export function leaveNow(s: StatusRow, p: Prefs): Decision {
  if (blocked(p) || p.alreadySentLeaveNow || s.eta_lo === null) return { send: false };
  if (s.eta_lo - p.walkMin - 2 > 0) return { send: false };
  if (s.source === "LIVE" || (s.source === "RECENT" && s.ageMin < 3))
    return { send: true, kind: "leave_now", text: "Time to head out to your stop." };
  if (s.source === "ESTIMATE")
    return { send: true, kind: "leave_now_estimate", text: "Time to head out (estimate)." };
  return { send: false };
}

/** Running late: >= 7 min over median for 2 consecutive refreshes; clears below 4; 10 min cooldown. */
export interface LateState { active: boolean; consecutiveOver: number; minSinceLastPush: number | null }
export function runningLate(lateMin: number, st: LateState, p: Pick<Prefs, "quietNow" | "lastPushMinAgoForStop">):
  { state: LateState; decision: Decision } {
  const next: LateState = { ...st };
  next.consecutiveOver = lateMin >= 7 ? st.consecutiveOver + 1 : 0;
  if (st.active && lateMin < 4) next.active = false;
  const cooled = st.minSinceLastPush === null || st.minSinceLastPush >= 10;
  if (!st.active && next.consecutiveOver >= 2 && cooled && !blocked(p)) {
    next.active = true;
    return { state: next, decision: { send: true, kind: "running_late", text: `Running about ${Math.round(lateMin)} min later than usual.` } };
  }
  return { state: next, decision: { send: false } };
}

/** Not seen yet: usual pickup + 10 min with no LIVE/RECENT track. */
export function notSeenYet(minPastUsual: number, hasLiveOrRecent: boolean, p: Pick<Prefs, "quietNow" | "lastPushMinAgoForStop">): Decision {
  if (blocked(p) || hasLiveOrRecent || minPastUsual < 10) return { send: false };
  return { send: true, kind: "not_seen", text: "Your bus hasn't been seen yet. Check https://busupdates.wcpss.net" };
}

/** Passed your stop: LIVE centroid is >= 100 m past the stop along the route. */
export function passedStop(metersPastStop: number, source: Source, p: Pick<Prefs, "quietNow" | "lastPushMinAgoForStop">): Decision {
  if (blocked(p) || source !== "LIVE" || metersPastStop < 100) return { send: false };
  return { send: true, kind: "passed_stop", text: "The bus has passed your stop." };
}

/** Quiet hours as "HH:MM" strings; works across midnight (e.g. 21:00 -> 06:30). Start == end means no quiet hours. */
export function isQuiet(nowHHMM: string, start?: string, end?: string): boolean {
  if (!start || !end || start === end) return false;
  return start < end ? nowHHMM >= start && nowHHMM < end : nowHHMM >= start || nowHHMM < end;
}

/** Per-alert switches saved from the app (all default to on). */
export function alertEnabled(prefs: Record<string, unknown> | null | undefined, key: string): boolean {
  return prefs?.[key] !== false;
}
