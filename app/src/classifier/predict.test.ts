import { describe, expect, it } from "vitest";
import { predictBus, shouldUpload, UPLOAD_THRESHOLD, type Model } from "./predict";

const m: Model = { features: ["a", "b"], mean: [0, 0], scale: [1, 1], weights: [1, -1], bias: 0 };

describe("predictBus", () => {
  it("matches the hand-computed sigmoid(1)", () => expect(predictBus([2, 1], m)).toBeCloseTo(0.7310585786, 8));
  it("is 0.5 at the decision boundary", () => expect(predictBus([1, 1], m)).toBeCloseTo(0.5, 10));
  it("applies the scaler", () => {
    const s: Model = { ...m, mean: [10, 0], scale: [2, 1] };
    expect(predictBus([12, 1], s)).toBeCloseTo(0.5, 10); // ((12-10)/2)*1 - 1 = 0
  });
  it("does not overflow for extreme inputs", () => {
    expect(predictBus([1e6, 0], m)).toBeLessThanOrEqual(1);
    expect(predictBus([-1e6, 0], m)).toBeGreaterThanOrEqual(0);
  });
});

describe("shouldUpload", () => {
  it("threshold is 0.7", () => expect(UPLOAD_THRESHOLD).toBe(0.7));
  it("uploads above threshold, not below", () => {
    expect(shouldUpload([2, 1], m)).toBe(true); // 0.731
    expect(shouldUpload([1, 1], m)).toBe(false); // 0.5
  });
});

import model from "./model.json";
import vectors from "./vectors.json";
import { windowFeatures, type Row } from "./features";

describe("matches Python on shared test vectors", () => {
  vectors.forEach((v, i) => {
    it(`vector ${i}`, () => {
      const f = windowFeatures(v.window as Row[]);
      f.forEach((x, k) => expect(x).toBeCloseTo(v.features[k], 6));
      expect(predictBus(v.features, model as Model)).toBeCloseTo(v.p_bus, 8);
    });
  });
});
