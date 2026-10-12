import { describe, expect, it } from "vitest";
import { AFTERNOON_OPTIONS, MORNING_OPTIONS, isStudentId, label, parseLabel, timeOptions, toHHMM, windowsFromTimes } from "./times";

describe("times", () => {
  it("formats minutes as 12-hour labels", () => {
    expect(label(7 * 60 + 5)).toBe("7:05 AM");
    expect(label(0)).toBe("12:00 AM");
    expect(label(12 * 60)).toBe("12:00 PM");
    expect(label(15 * 60 + 40)).toBe("3:40 PM");
  });
  it("parseLabel inverts label for every option", () => {
    [...MORNING_OPTIONS, ...AFTERNOON_OPTIONS].forEach((o) => expect(label(parseLabel(o)!)).toBe(o));
    expect(parseLabel("nope")).toBeNull();
  });
  it("options cover the ranges in 5 minute steps", () => {
    expect(MORNING_OPTIONS[0]).toBe("5:00 AM");
    expect(MORNING_OPTIONS.at(-1)).toBe("10:00 AM");
    expect(AFTERNOON_OPTIONS.at(-1)).toBe("6:00 PM");
    expect(timeOptions(0, 10, 5)).toHaveLength(3);
  });
  it("builds sensing windows around the times", () => {
    expect(windowsFromTimes(7 * 60 + 5, 15 * 60 + 30)).toEqual({ amStart: "06:50", amEnd: "08:05", pmStart: "15:20", pmEnd: "16:45" });
  });
  it("toHHMM pads", () => expect(toHHMM(65)).toBe("01:05"));
  it("student id validation", () => {
    expect(isStudentId("123456789")).toBe(true);
    expect(isStudentId(" 123456 ")).toBe(true);
    expect(isStudentId("1234")).toBe(false);
    expect(isStudentId("12a456")).toBe(false);
  });
});
