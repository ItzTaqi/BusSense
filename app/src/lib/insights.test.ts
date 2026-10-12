import { describe, expect, it } from "vitest";
import { computeInsights, trendText } from "./insights";

const now = new Date("2026-10-14T12:00:00Z"); // a Wednesday
const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

describe("computeInsights", () => {
  it("handles no reports", () => {
    const i = computeInsights([], 4, now);
    expect(i.trend).toBe("none");
    expect(i.worstDay).toBeNull();
    expect(trendText(i)).toBe("No reports yet");
  });
  it("buckets reports by week, oldest first", () => {
    const i = computeInsights([
      { kind: "no_show", t: day(1) }, { kind: "no_show", t: day(2) },
      { kind: "no_show", t: day(9) }, { kind: "early", t: day(3) }], 4, now);
    expect(i.series).toEqual([0, 0, 1, 2]);
    expect(i.thisWeek).toBe(2);
    expect(i.lastWeek).toBe(1);
    expect(i.trend).toBe("up");
    expect(i.totalEarly).toBe(1);
  });
  it("ignores reports outside the window or in the future", () => {
    const i = computeInsights([{ kind: "no_show", t: day(40) }, { kind: "no_show", t: day(-2) }], 4, now);
    expect(i.totalNoShow).toBe(0);
  });
  it("finds the worst weekday", () => {
    const i = computeInsights([{ kind: "no_show", t: day(1) }, { kind: "no_show", t: day(8) }, { kind: "no_show", t: day(2) }], 4, now);
    expect(i.worstDay).toBe("Tuesday"); // day(1) and day(8) are both Tuesdays
  });
  it("trend down", () => {
    const i = computeInsights([{ kind: "no_show", t: day(8) }, { kind: "no_show", t: day(9) }, { kind: "no_show", t: day(1) }], 4, now);
    expect(i.trend).toBe("down");
    expect(trendText(i)).toBe("Down from 2 last week");
  });
});
