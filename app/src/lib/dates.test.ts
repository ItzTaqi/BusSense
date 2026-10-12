import { describe, expect, it } from "vitest";
import { ageOn, daysInMonth, firstWeekday, formatMDY, isFuture } from "./dates";

const today = new Date(2026, 9, 11); // Oct 11, 2026
describe("dates", () => {
  it("days in month incl. leap years", () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2026, 9)).toBe(31);
  });
  it("first weekday: Oct 1 2026 is a Thursday", () => expect(firstWeekday(2026, 9)).toBe(4));
  it("formats MM/DD/YYYY", () => expect(formatMDY({ y: 2011, m: 3, d: 7 })).toBe("03/07/2011"));
  it("age turns over on the birthday", () => {
    expect(ageOn({ y: 2013, m: 10, d: 11 }, today)).toBe(13);
    expect(ageOn({ y: 2013, m: 10, d: 12 }, today)).toBe(12);
  });
  it("future dates are flagged", () => expect(isFuture({ y: 2027, m: 1, d: 1 }, today)).toBe(true));
});
