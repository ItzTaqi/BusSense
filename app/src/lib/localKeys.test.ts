import { describe, expect, it } from "vitest";
import { ALL_LOCAL_KEYS, KEYS } from "./localKeys";

describe("local storage keys", () => {
  it("are unique and namespaced", () => {
    expect(new Set(ALL_LOCAL_KEYS).size).toBe(ALL_LOCAL_KEYS.length);
    ALL_LOCAL_KEYS.forEach((k) => expect(k.startsWith("gonc.")).toBe(true));
  });
  it("cover everything the app saves", () => {
    expect(Object.keys(KEYS).sort()).toEqual(["alertPrefs", "appearance", "children", "rides", "terms"]);
  });
});
