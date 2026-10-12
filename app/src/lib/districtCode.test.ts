import { describe, expect, it } from "vitest";
import { parseDistrictCode } from "./districtCode";

describe("parseDistrictCode", () => {
  it("derives the bus number from the code", () => expect(parseDistrictCode("H-0412")).toEqual({ code: "H-0412", bus: "412" }));
  it("normalizes case and whitespace", () => expect(parseDistrictCode(" e7 ")).toEqual({ code: "E7", bus: "7" }));
  it("uses the last run of digits", () => expect(parseDistrictCode("A12-B034")?.bus).toBe("34"));
  it("rejects codes with no digits", () => expect(parseDistrictCode("ABC")).toBeNull());
  it("rejects junk and too-short input", () => {
    expect(parseDistrictCode("")).toBeNull();
    expect(parseDistrictCode("7")).toBeNull();
    expect(parseDistrictCode("BUS 12")).toBeNull();
  });
  it("rejects bus 0", () => expect(parseDistrictCode("A-000")).toBeNull());
});
