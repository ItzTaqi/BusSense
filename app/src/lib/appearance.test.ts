import { describe, expect, it } from "vitest";
import { isAppearance, resolveScheme } from "./appearance";

describe("resolveScheme", () => {
  it("system follows the device", () => {
    expect(resolveScheme("system", "dark")).toBe("dark");
    expect(resolveScheme("system", "light")).toBe("light");
  });
  it("system falls back to light when the device is unknown", () => {
    expect(resolveScheme("system", null)).toBe("light");
    expect(resolveScheme("system", undefined)).toBe("light");
  });
  it("an explicit choice ignores the device", () => {
    expect(resolveScheme("light", "dark")).toBe("light");
    expect(resolveScheme("dark", "light")).toBe("dark");
  });
  it("validates saved values", () => {
    expect(isAppearance("dark")).toBe(true);
    expect(isAppearance("blue")).toBe(false);
    expect(isAppearance(null)).toBe(false);
  });
});

describe("odd device values", () => {
  it("treats unspecified as light", () => expect(resolveScheme("system", "unspecified")).toBe("light"));
});
