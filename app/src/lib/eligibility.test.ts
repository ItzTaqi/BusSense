import { describe, expect, it } from "vitest";
import { MIN_RIDER_AGE, isEligibleRider } from "./eligibility";

const today = new Date(2026, 9, 11);
describe("eligibility", () => {
  it("minimum age is 13", () => expect(MIN_RIDER_AGE).toBe(13));
  it("12 year old is not eligible", () => expect(isEligibleRider({ y: 2014, m: 6, d: 1 }, today)).toBe(false));
  it("turns eligible on the 13th birthday", () => {
    expect(isEligibleRider({ y: 2013, m: 10, d: 11 }, today)).toBe(true);
    expect(isEligibleRider({ y: 2013, m: 10, d: 12 }, today)).toBe(false);
  });
  it("adult is eligible", () => expect(isEligibleRider({ y: 2000, m: 1, d: 1 }, today)).toBe(true));
});
