import { describe, expect, it } from "vitest";
import { TERMS_VERSION, needsAgreement } from "./terms";

describe("terms agreement", () => {
  it("asks when nothing is saved", () => expect(needsAgreement(null)).toBe(true));
  it("asks again after the terms change", () => expect(needsAgreement("2020-01-01")).toBe(true));
  it("does not ask once the current version is accepted", () => expect(needsAgreement(TERMS_VERSION)).toBe(false));
});
