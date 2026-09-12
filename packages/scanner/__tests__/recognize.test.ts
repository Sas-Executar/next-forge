import { describe, expect, it } from "vitest";
import { DEFAULT_SIMILARITY_THRESHOLD, recognize } from "../src/recognize";
import type { RegisteredSymbol } from "../src/types";

const symbol = (
  symbolId: string,
  embeddings: readonly Float32Array[],
  enabled = true
): RegisteredSymbol => ({
  id: `db-${symbolId}`,
  symbolId,
  semantic: "CHAT",
  command: "OPEN_CHAT",
  embeddings,
  enabled,
});

describe("recognize", () => {
  it("recognizes a query embedding matching a registered reference above threshold", () => {
    const reference = new Float32Array([1, 0, 0]);
    const candidates = [symbol("SYM-CHAT-001", [reference])];
    const result = recognize(new Float32Array([1, 0, 0]), candidates);
    expect(result.status).toBe("RECOGNIZED");
    if (result.status === "RECOGNIZED") {
      expect(result.symbolId).toBe("SYM-CHAT-001");
      expect(result.similarity).toBeCloseTo(1, 5);
    }
  });

  it("returns UNKNOWN — never authorizing execution — for a query with no close match", () => {
    const candidates = [symbol("SYM-CHAT-001", [new Float32Array([1, 0, 0])])];
    const result = recognize(new Float32Array([0, 1, 0]), candidates);
    expect(result.status).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for an empty registry rather than throwing", () => {
    const result = recognize(new Float32Array([1, 0, 0]), []);
    expect(result.status).toBe("UNKNOWN");
  });

  it("rejects a near-but-below-threshold match (nearest neighbor alone doesn't authorize)", () => {
    // cos(30deg) ~= 0.866, still above 0.85 default — use a wider angle.
    const reference = new Float32Array([1, 0]);
    const query = new Float32Array([0.7, 0.7]); // 45 degrees, cos ~= 0.707
    const result = recognize(query, [symbol("SYM-CHAT-001", [reference])]);
    expect(result.status).toBe("UNKNOWN");
  });

  it("takes the best similarity across a symbol's multiple enrolled reference embeddings", () => {
    const candidates = [
      symbol("SYM-DONE-001", [
        new Float32Array([0, 1, 0]),
        new Float32Array([1, 0, 0]), // this one matches the query exactly
      ]),
    ];
    const result = recognize(new Float32Array([1, 0, 0]), candidates);
    expect(result.status).toBe("RECOGNIZED");
    if (result.status === "RECOGNIZED") {
      expect(result.similarity).toBeCloseTo(1, 5);
    }
  });

  it("excludes disabled symbols from matching, not just from dispatch", () => {
    const candidates = [
      symbol("SYM-CHAT-001", [new Float32Array([1, 0, 0])], false),
    ];
    const result = recognize(new Float32Array([1, 0, 0]), candidates);
    expect(result.status).toBe("UNKNOWN");
  });

  it("picks the best match across multiple distinct candidates", () => {
    const candidates = [
      symbol("SYM-CHAT-001", [new Float32Array([0, 1, 0])]),
      symbol("SYM-DONE-001", [new Float32Array([1, 0, 0])]),
    ];
    const result = recognize(new Float32Array([1, 0, 0]), candidates);
    expect(result.status).toBe("RECOGNIZED");
    if (result.status === "RECOGNIZED") {
      expect(result.symbolId).toBe("SYM-DONE-001");
    }
  });

  it("respects a caller-supplied threshold override", () => {
    const reference = new Float32Array([1, 0]);
    const query = new Float32Array([0.7, 0.7]);
    const lenient = recognize(
      query,
      [symbol("SYM-CHAT-001", [reference])],
      0.5
    );
    expect(lenient.status).toBe("RECOGNIZED");
    expect(DEFAULT_SIMILARITY_THRESHOLD).toBeGreaterThan(0.5);
  });
});
