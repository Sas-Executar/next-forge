import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  EmbeddingDimensionMismatchError,
} from "../src/similarity";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([-1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it("returns 0 for a zero vector rather than NaN", () => {
    const zero = new Float32Array([0, 0, 0]);
    const other = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(zero, other)).toBe(0);
    expect(Number.isNaN(cosineSimilarity(zero, other))).toBe(false);
  });

  it("is scale-invariant", () => {
    const a = new Float32Array([1, 2, 3]);
    const scaled = new Float32Array([2, 4, 6]);
    expect(cosineSimilarity(a, scaled)).toBeCloseTo(1, 5);
  });

  it("throws EmbeddingDimensionMismatchError for mismatched lengths", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2]);
    expect(() => cosineSimilarity(a, b)).toThrow(
      EmbeddingDimensionMismatchError
    );
  });
});
