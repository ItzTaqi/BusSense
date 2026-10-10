/**
 * On-phone bus-vs-car inference.
 *
 * The idea: the phone computes six numbers from the last 180 s and asks the logistic regression
 * trained in Python "is this a bus?". Location is uploaded only while P(bus) >= 0.7.
 * The math: z = sum_i weights[i] * (x[i] - mean[i]) / scale[i] + bias;  P = 1 / (1 + exp(-z)).
 * Matches the Python output on shared test vectors (vectors.json).
 */
export interface Model {
  features: string[];
  mean: number[];
  scale: number[];
  weights: number[];
  bias: number;
}

export const UPLOAD_THRESHOLD = 0.7;

export function predictBus(x: number[], m: Model): number {
  let z = m.bias;
  for (let i = 0; i < m.weights.length; i++) z += (m.weights[i] * (x[i] - m.mean[i])) / m.scale[i];
  // numerically stable sigmoid
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

/** Fail closed: if inference is not ready or errors, do NOT upload. */
export function shouldUpload(x: number[], m: Model): boolean {
  try {
    return predictBus(x, m) >= UPLOAD_THRESHOLD;
  } catch {
    return false;
  }
}
