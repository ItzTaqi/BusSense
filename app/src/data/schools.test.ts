import { describe, expect, it } from "vitest";
import { CITIES, schoolsIn } from "./schools";

describe("schools", () => {
  it("has Cary and Raleigh", () => expect(CITIES).toEqual(expect.arrayContaining(["Cary", "Raleigh"])));
  it("lists high schools first", () => expect(/high/i.test(schoolsIn("Cary")[0])).toBe(true));
  it("no cross-state leftovers", () => {
    const all = CITIES.flatMap(schoolsIn);
    expect(all.some((n) => /Cary-Grove|Pike County/.test(n))).toBe(false);
  });
  it("unknown city is empty", () => expect(schoolsIn("Nowhere")).toEqual([]));
});
