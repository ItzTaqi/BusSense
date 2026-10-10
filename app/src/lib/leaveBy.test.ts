import { describe, expect, it } from "vitest";
import { leaveByMinutes, sourceLabel } from "./leaveBy";

describe("leaveBy", () => {
  it("subtracts walk and 2 min buffer", () => expect(leaveByMinutes(10, 3)).toBe(5));
  it("never negative", () => expect(leaveByMinutes(2, 3)).toBe(0));
  it("null when no ETA", () => expect(leaveByMinutes(null, 3)).toBeNull());
  it("badge is text", () => expect(sourceLabel("NO_DATA")).toBe("NO DATA"));
});
