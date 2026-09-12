import "server-only";
import { forWorkspace } from "@repo/database";
import { decodeEmbeddings, encodeEmbeddings } from "./embedding-codec";
import type {
  RegisteredSymbol,
  VisualCommand,
  VisualSymbolSemantic,
} from "./types";

/**
 * SymbolRegistry (SPEC-SCANNER-001's pipeline stage of the same name;
 * REQ-SCAN-003 "manter registry local de símbolos e embeddings").
 * "Local" per the spec means on-device for matching (apps/mobile keeps
 * its own cached copy for offline recognition, REQ-SCAN-002) — this
 * module is the canonical workspace-scoped source of truth those
 * on-device copies sync from, the same source-of-truth/cache split
 * every other workspace-scoped table in this repo already has.
 */
export const toRegisteredSymbol = (row: {
  readonly id: string;
  readonly symbolId: string;
  readonly semantic: VisualSymbolSemantic;
  readonly command: VisualCommand;
  readonly embeddings: Buffer | Uint8Array | null;
  readonly enabled: boolean;
}): RegisteredSymbol => ({
  id: row.id,
  symbolId: row.symbolId,
  semantic: row.semantic,
  command: row.command,
  embeddings: row.embeddings
    ? decodeEmbeddings(Buffer.from(row.embeddings))
    : [],
  enabled: row.enabled,
});

export const listEnabledSymbols = async (
  workspaceId: string
): Promise<readonly RegisteredSymbol[]> => {
  const db = forWorkspace(workspaceId);
  const rows = await db.visualSymbol.findMany({
    where: { enabled: true },
  });
  return rows.map(toRegisteredSymbol);
};

/**
 * Enrollment (SPEC-SCANNER-001 "Enrollment", REQ-SCAN-004). Upserts by
 * [workspaceId, symbolId] (the VisualSymbol model's existing unique
 * constraint, M02) — "o usuário MAY substituir/cadastrar referência
 * visual sem retreinar ou alterar os pesos do encoder": re-enrolling an
 * existing symbolId replaces its stored embeddings wholesale, which is
 * exactly "substituir a referência visual," never touching the
 * (device-side, not this package's concern) encoder weights.
 *
 * Takes pre-computed embeddings, not raw images the way
 * SPEC-SCANNER-001's illustrative `registerSymbol(images, command)`
 * signature reads — encoding an image is DINOv2/onnxruntime work,
 * inherently on-device (apps/mobile's vision/dinov2-encoder.ts), and
 * this package is deliberately platform-agnostic (no ONNX/image
 * decoding dependency — see recognize.ts's own comment on the same
 * split). apps/mobile's enrollment screen calls the on-device encoder
 * per reference image first, then this function with the resulting
 * Float32Array[].
 */
export const registerSymbol = async (
  workspaceId: string,
  input: {
    readonly symbolId: string;
    readonly semantic: VisualSymbolSemantic;
    readonly command: VisualCommand;
    readonly embeddings: readonly Float32Array[];
  }
): Promise<RegisteredSymbol> => {
  const db = forWorkspace(workspaceId);
  // Prisma's Bytes field wants a Uint8Array<ArrayBuffer> specifically;
  // Node's Buffer type is Uint8Array<ArrayBufferLike> (which also
  // admits SharedArrayBuffer), a structural mismatch under strict TS
  // even though every real Buffer here is genuinely ArrayBuffer-backed
  // — Uint8Array.from() makes a definite-ArrayBuffer copy instead of a
  // type assertion.
  const embeddingsBuffer = Uint8Array.from(encodeEmbeddings(input.embeddings));
  const row = await db.visualSymbol.upsert({
    where: { workspaceId_symbolId: { workspaceId, symbolId: input.symbolId } },
    create: {
      workspaceId,
      symbolId: input.symbolId,
      semantic: input.semantic,
      command: input.command,
      embeddings: embeddingsBuffer,
      enabled: true,
    },
    update: {
      semantic: input.semantic,
      command: input.command,
      embeddings: embeddingsBuffer,
      enabled: true,
    },
  });
  return toRegisteredSymbol(row);
};

/**
 * Lets an in-progress re-enrollment disable the old reference images
 * without deleting the row (REQ-SCAN-004's "substituir... sem
 * retreinar" flow: disable, capture new references, call
 * registerSymbol() again to re-enable with the new embeddings).
 * recognize.ts already excludes disabled symbols from matching
 * entirely, not just from dispatch.
 */
export const setSymbolEnabled = async (
  workspaceId: string,
  symbolId: string,
  enabled: boolean
): Promise<void> => {
  const db = forWorkspace(workspaceId);
  await db.visualSymbol.update({
    where: { workspaceId_symbolId: { workspaceId, symbolId } },
    data: { enabled },
  });
};
