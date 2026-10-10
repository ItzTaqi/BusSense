import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

describe("i18n", () => {
  it("es has every en key", () => expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort()));
});
