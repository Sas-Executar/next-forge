/**
 * Serializes SPEC-SCANNER-001's `embeddings: Float32Array[]` (multiple
 * reference embeddings per enrolled symbol) into the single `Bytes?`
 * column packages/database's VisualSymbol model actually has (M02,
 * pre-existing) — a real, disclosed reconciliation between the spec's
 * illustrative TS interface and this repo's already-provisioned Prisma
 * schema (not something this milestone can or should change; adding a
 * child table for per-embedding rows would be a bigger schema change
 * than one Bytes column, without the spec ever asking for one).
 *
 * Wire format: [count: uint32 LE][dim: uint32 LE][count * dim float32
 * LE values]. Every embedding in one symbol must share the same
 * dimensionality (DINOv2 ViT-S/14's own output is fixed-size; a
 * mismatched dim would mean a broken enrollment, not a valid state).
 */
export class EmptyEmbeddingListError extends Error {
  constructor() {
    super("Cannot encode an empty embeddings list.");
    this.name = "EmptyEmbeddingListError";
  }
}

export class InconsistentEmbeddingDimensionError extends Error {
  constructor() {
    super("All embeddings for one symbol must share the same dimension.");
    this.name = "InconsistentEmbeddingDimensionError";
  }
}

export const encodeEmbeddings = (
  embeddings: readonly Float32Array[]
): Buffer => {
  if (embeddings.length === 0) {
    throw new EmptyEmbeddingListError();
  }
  const dim = embeddings[0]?.length ?? 0;
  if (embeddings.some((e) => e.length !== dim)) {
    throw new InconsistentEmbeddingDimensionError();
  }

  const header = Buffer.alloc(8);
  header.writeUInt32LE(embeddings.length, 0);
  header.writeUInt32LE(dim, 4);

  const body = Buffer.alloc(embeddings.length * dim * 4);
  let offset = 0;
  for (const embedding of embeddings) {
    for (const value of embedding) {
      body.writeFloatLE(value, offset);
      offset += 4;
    }
  }

  return Buffer.concat([header, body]);
};

export const decodeEmbeddings = (bytes: Buffer): readonly Float32Array[] => {
  const count = bytes.readUInt32LE(0);
  const dim = bytes.readUInt32LE(4);
  const embeddings: Float32Array[] = [];
  let offset = 8;
  for (let i = 0; i < count; i++) {
    const values = new Float32Array(dim);
    for (let j = 0; j < dim; j++) {
      values[j] = bytes.readFloatLE(offset);
      offset += 4;
    }
    embeddings.push(values);
  }
  return embeddings;
};
