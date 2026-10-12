import { describe, expect, it } from "vitest";
import { dailyBreakdown, weekOptions, weekStart, weekTotals } from "./weekly";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0);
const rep = (kind: "no_show" | "early", dt: Date) => ({ kind, t: dt.toISOString() });

describe("weekStart", () => {
  it("returns Monday 00:00 for any day in the week", () => {
    // Oct 12 2026 is a Monday; Oct 18 is the Sunday that ends that week
    expect(weekStart(at(2026, 10, 12)).getDate()).toBe(12);
    expect(weekStart(at(2026, 10, 14)).getDate()).toBe(12);
    expect(weekStart(at(2026, 10, 18, 23)).getDate()).toBe(12);
    expect(weekStart(at(2026, 10, 18, 23)).getHours()).toBe(0);
    expect(weekStart(at(2026, 10, 19)).getDate()).toBe(19);
  });
});

describe("weekOptions", () => {
  const opts = weekOptions(at(2026, 10, 14), 8);
  it("starts with this week and goes back", () => {
    expect(opts.length).toBe(8);
    expect(opts[0].label.startsWith("This week")).toBe(true);
    expect(opts[1].label.startsWith("Last week")).toBe(true);
    expect(opts[2].start.getDate()).toBe(28); // Sep 28
    expect(opts[2].start.getMonth()).toBe(8);
  });
  it("has unique labels and 7-day spans", () => {
    expect(new Set(opts.map((o) => o.label)).size).toBe(8);
    expect(opts[0].end.getDate() - opts[0].start.getDate()).toBe(6);
  });
});

describe("dailyBreakdown", () => {
  const monday = at(2026, 10, 12, 0);
  it("shows Monday to Friday even with no reports", () => {
    const days = dailyBreakdown([], monday);
    expect(days.length).toBe(5);
    expect(weekTotals(days)).toEqual({ noShow: 0, early: 0 });
  });
  it("counts each day separately", () => {
    const days = dailyBreakdown([rep("no_show", at(2026, 10, 13)), rep("no_show", at(2026, 10, 13, 15)), rep("early", at(2026, 10, 15))], monday);
    expect(days[1].noShow).toBe(2);
    expect(days[3].early).toBe(1);
    expect(weekTotals(days)).toEqual({ noShow: 2, early: 1 });
  });
  it("adds a weekend day only when it has reports", () => {
    const days = dailyBreakdown([rep("no_show", at(2026, 10, 17))], monday);
    expect(days.length).toBe(6);
    expect(days[5].noShow).toBe(1);
  });
  it("ignores reports from other weeks", () => {
    const days = dailyBreakdown([rep("no_show", at(2026, 10, 5)), rep("no_show", at(2026, 10, 19))], monday);
    expect(weekTotals(days)).toEqual({ noShow: 0, early: 0 });
  });
});
