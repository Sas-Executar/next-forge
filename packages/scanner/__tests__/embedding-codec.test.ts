import { describe, expect, it } from "vitest";
import {
  decodeEmbeddings,
  EmptyEmbeddingListError,
  encodeEmbeddings,
  InconsistentEmbeddingDimensionError,
} from "../src/embedding-codec";

describe("encodeEmbeddings / decodeEmbeddings", () => {
  it("round-trips a single embedding", () => {
    const embeddings = [new Float32Array([0.1, 0.2, 0.3])];
    const decoded = decodeEmbeddings(encodeEmbeddings(embeddings));
    expect(decoded).toHaveLength(1);
    expect(Array.from(decoded[0] as Float32Array)).toEqual(
      Array.from(embeddings[0] as Float32Array)
    );
  });

  it("round-trips multiple embeddings (multi-image enrollment)", () => {
    const embeddings = [
      new Float32Array([1, 2, 3, 4]),
      new Float32Array([5, 6, 7, 8]),
      new Float32Array([9, 10, 11, 12]),
    ];
    const decoded = decodeEmbeddings(encodeEmbeddings(embeddings));
    expect(decoded).toHaveLength(3);
    for (const [i, original] of embeddings.entries()) {
      expect(Array.from(decoded[i] as Float32Array)).toEqual(
        Array.from(original)
      );
    }
  });

  it("preserves float precision within Float32 tolerance", () => {
    const embeddings = [new Float32Array([-0.123_456, 0.987_654])];
    const decoded = decodeEmbeddings(encodeEmbeddings(embeddings));
    expect(decoded[0]?.[0]).toBeCloseTo(-0.123_456, 5);
    expect(decoded[0]?.[1]).toBeCloseTo(0.987_654, 5);
  });

  it("throws EmptyEmbeddingListError for an empty list", () => {
    expect(() => encodeEmbeddings([])).toThrow(EmptyEmbeddingListError);
  });

  it("throws InconsistentEmbeddingDimensionError for mismatched dims", () => {
    const embeddings = [new Float32Array([1, 2, 3]), new Float32Array([1, 2])];
    expect(() => encodeEmbeddings(embeddings)).toThrow(
      InconsistentEmbeddingDimensionError
    );
  });
});
