/**
 * Cosine similarity between two equal-length embedding vectors — the
 * real nearest-neighbor matching primitive SymbolMatcher (SPEC-SCANNER-001's
 * pipeline) needs, independent of whatever produced the vectors
 * (DINOv2's actual embedding dimensionality is a model-acquisition
 * detail — M09-T01 — this function works for any length as long as
 * both sides match).
 */
export class EmbeddingDimensionMismatchError extends Error {
  constructor(a: number, b: number) {
    super(`Cannot compare embeddings of different dimensions: ${a} vs ${b}.`);
    this.name = "EmbeddingDimensionMismatchError";
  }
}

export const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
  if (a.length !== b.length) {
    throw new EmbeddingDimensionMismatchError(a.length, b.length);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
