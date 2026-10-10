import { describe, expect, it } from "vitest";
import { inAnyWindow, inWindow } from "./windows";

const at = (h: number, m: number) => new Date(2026, 9, 12, h, m);
describe("windows", () => {
  it("inside / outside", () => {
    expect(inWindow(at(7, 0), "06:45", "07:30")).toBe(true);
    expect(inWindow(at(8, 0), "06:45", "07:30")).toBe(false);
  });
  it("either window", () => expect(inAnyWindow(at(15, 0), [["06:45", "07:30"], ["14:30", "16:30"]])).toBe(true));
});
