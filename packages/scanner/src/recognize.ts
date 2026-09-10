import { cosineSimilarity } from "./similarity";
import type { RecognitionResult, RegisteredSymbol } from "./types";

/**
 * ADR-SCANNER-001's own text: "limiar de similaridade precisa ser
 * calibrado por testes" (the threshold needs calibration via testing)
 * — the corpus explicitly acknowledges no number is validated yet.
 * 0.85 is this package's own starting value (cosine similarity, [-1,1]
 * range), chosen as a conservative default that favors UNKNOWN over a
 * false positive — REQ-SCAN-006 requires rejection to actually reject,
 * not just exist as an unused parameter. Exported so a real on-device
 * calibration pass (future milestone, once a physical device and real
 * enrolled symbols exist) can override it without editing this file.
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * SymbolMatcher (SPEC-SCANNER-001's pipeline stage of the same name).
 * Pure and platform-agnostic: takes an already-computed query embedding
 * (produced by apps/mobile's on-device DINOv2 encoder — this package
 * has no ONNX/camera dependency by design, see this package's own
 * index.ts comment) and the registry's currently-enabled symbols, and
 * returns a real recognition decision.
 *
 * "Recognition MUST support rejection. A nearest neighbor alone MUST
 * NOT authorize execution" (SPEC-SCANNER-001) — enforced here: even the
 * best match across every candidate and every one of a symbol's
 * enrolled reference embeddings is rejected (UNKNOWN) below threshold.
 * A disabled symbol (VisualSymbol.enabled=false) is excluded from
 * matching entirely, not just from dispatch — REQ-SCAN-004's
 * enrollment/replacement flow can disable a symbol while re-enrolling
 * it without it still firing on the old reference images in the
 * meantime.
 */
export const recognize = (
  queryEmbedding: Float32Array,
  candidates: readonly RegisteredSymbol[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): RecognitionResult => {
  let best: { symbolId: string; similarity: number } | null = null;

  for (const candidate of candidates) {
    if (!candidate.enabled) {
      continue;
    }
    for (const reference of candidate.embeddings) {
      const similarity = cosineSimilarity(queryEmbedding, reference);
      if (!best || similarity > best.similarity) {
        best = { symbolId: candidate.symbolId, similarity };
      }
    }
  }

  if (!best || best.similarity < threshold) {
    return { status: "UNKNOWN", similarity: best?.similarity };
  }

  return {
    status: "RECOGNIZED",
    symbolId: best.symbolId,
    similarity: best.similarity,
  };
};
