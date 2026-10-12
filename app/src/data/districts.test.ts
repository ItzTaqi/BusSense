import { describe, expect, it } from "vitest";
import { DISTRICTS, defaultDistrictForCity, districtByLabel, districtLabel, isDistrictCode } from "./districts";

describe("districts", () => {
  it("codes are 5 digits and unique", () => {
    DISTRICTS.forEach((d) => expect(isDistrictCode(d.code)).toBe(true));
    expect(new Set(DISTRICTS.map((d) => d.code)).size).toBe(DISTRICTS.length);
  });
  it("validates typed codes", () => {
    expect(isDistrictCode("67500")).toBe(true);
    expect(isDistrictCode("6750")).toBe(false);
    expect(isDistrictCode("67a00")).toBe(false);
  });
  it("Wake cities default to WCPSS yellow bus", () => expect(defaultDistrictForCity("Cary")?.code).toBe("67500"));
  it("unknown city has no default", () => expect(defaultDistrictForCity("Durham")).toBeUndefined());
  it("label round-trips", () => expect(districtByLabel(districtLabel(DISTRICTS[2]))).toEqual(DISTRICTS[2]));
});
