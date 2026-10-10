import { describe, expect, it } from "vitest";
import { leaveNow, notSeenYet, passedStop, runningLate } from "./alertRules";

const base = { walkMin: 3, quietNow: false, lastPushMinAgoForStop: null, alreadySentLeaveNow: false };
describe("leaveNow", () => {
  it("fires for LIVE when eta_lo - walk - 2 <= 0", () =>
    expect(leaveNow({ source: "LIVE", eta_lo: 5, ageMin: 0 }, base).send).toBe(true));
  it("does not fire when far away", () =>
    expect(leaveNow({ source: "LIVE", eta_lo: 9, ageMin: 0 }, base).send).toBe(false));
  it("RECENT older than 3 min does not fire", () =>
    expect(leaveNow({ source: "RECENT", eta_lo: 3, ageMin: 4 }, base).send).toBe(false));
  it("ESTIMATE is labelled (estimate)", () => {
    const d = leaveNow({ source: "ESTIMATE", eta_lo: 3, ageMin: 0 }, base);
    expect(d.send && d.text).toContain("(estimate)");
  });
  it("once per trip, quiet hours, 5 min rate limit", () => {
    const s = { source: "LIVE", eta_lo: 3, ageMin: 0 } as const;
    expect(leaveNow(s, { ...base, alreadySentLeaveNow: true }).send).toBe(false);
    expect(leaveNow(s, { ...base, quietNow: true }).send).toBe(false);
    expect(leaveNow(s, { ...base, lastPushMinAgoForStop: 2 }).send).toBe(false);
  });
});
describe("runningLate", () => {
  const q = { quietNow: false, lastPushMinAgoForStop: null };
  it("needs 2 consecutive refreshes >= 7", () => {
    let st = { active: false, consecutiveOver: 0, minSinceLastPush: null as number | null };
    let r = runningLate(8, st, q); expect(r.decision.send).toBe(false);
    r = runningLate(8, r.state, q); expect(r.decision.send).toBe(true);
  });
  it("clears below 4", () => {
    const r = runningLate(3, { active: true, consecutiveOver: 2, minSinceLastPush: 20 }, q);
    expect(r.state.active).toBe(false);
  });
  it("respects 10 minute cooldown", () => {
    const r = runningLate(9, { active: false, consecutiveOver: 5, minSinceLastPush: 4 }, q);
    expect(r.decision.send).toBe(false);
  });
});
describe("notSeen / passedStop", () => {
  const q = { quietNow: false, lastPushMinAgoForStop: null };
  it("notSeen links to WCPSS", () => {
    const d = notSeenYet(10, false, q);
    expect(d.send && d.text).toContain("https://busupdates.wcpss.net");
  });
  it("notSeen silent if a bus is live", () => expect(notSeenYet(20, true, q).send).toBe(false));
  it("passedStop at 100 m LIVE only", () => {
    expect(passedStop(100, "LIVE", q).send).toBe(true);
    expect(passedStop(99, "LIVE", q).send).toBe(false);
    expect(passedStop(500, "RECENT", q).send).toBe(false);
  });
});
