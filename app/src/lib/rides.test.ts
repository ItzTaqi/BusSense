import { describe, expect, it } from "vitest";
import { Ride, addRide, durationMin, outcomeText, rideTitle } from "./rides";

const mk = (id: string, startedAt: number, extra: Partial<Ride> = {}): Ride => ({ id, startedAt, endedAt: startedAt + 18 * 60000, bus: "412", published: true, maxRiders: 4, ...extra });

describe("rides", () => {
  it("keeps newest first and replaces duplicate ids", () => {
    const list = addRide(addRide([], mk("a", 1000)), mk("b", 5000));
    expect(list.map((r) => r.id)).toEqual(["b", "a"]);
    expect(addRide(list, mk("a", 1000, { published: false })).find((r) => r.id === "a")?.published).toBe(false);
    expect(addRide(list, mk("a", 1000)).length).toBe(2);
  });
  it("caps the history", () => {
    let l: Ride[] = [];
    for (let i = 0; i < 60; i++) l = addRide(l, mk(String(i), i * 1000));
    expect(l.length).toBe(50);
    expect(l[0].id).toBe("59");
  });
  it("duration is at least a minute", () => {
    expect(durationMin(mk("x", 0))).toBe(18);
    expect(durationMin({ ...mk("x", 0), endedAt: 1000 })).toBe(1);
  });
  it("describes the outcome honestly", () => {
    expect(outcomeText(mk("x", 0))).toBe("Shared with 4 riders");
    expect(outcomeText(mk("x", 0, { published: false, maxRiders: 2 }))).toBe("Not shown: fewer than 3 riders");
    expect(outcomeText(mk("x", 0, { published: null, maxRiders: null }))).toBe("Receipt unavailable");
  });
  it("titles say Today and Yesterday", () => {
    const now = new Date(2026, 9, 12, 15, 0);
    expect(rideTitle(mk("x", new Date(2026, 9, 12, 7, 5).getTime()), now)).toMatch(/^Today, /);
    expect(rideTitle(mk("x", new Date(2026, 9, 11, 7, 5).getTime()), now)).toMatch(/^Yesterday, /);
  });
});
