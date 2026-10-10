import { describe, expect, it, vi } from "vitest";
vi.mock("expo-crypto", () => ({ randomUUID: () => crypto.randomUUID() }));
import { canEnableSensing, newTripToken } from "./tripToken";

describe("tripToken", () => {
  it("is unique per trip", () => expect(newTripToken()).not.toBe(newTripToken()));
});
describe("canEnableSensing", () => {
  it("blocks under 13", () => expect(canEnableSensing(2016, new Date("2026-10-10"))).toBe(false));
  it("allows 13+", () => expect(canEnableSensing(2013, new Date("2026-10-10"))).toBe(true));
});
