/**
 * @repo/scanner — SPEC-SCANNER-001 / API-SCANNER-ACTION-001 /
 * PRD-SCANNER-001 (M09). This root barrel is deliberately React-Native
 * safe: no camera, no ONNX runtime, no `@repo/database`/`server-only`
 * dependency anywhere in its module graph — apps/mobile imports
 * directly from here. The DB-backed SymbolRegistry/CommandDispatcher
 * (registry.ts/dispatch.ts) live behind a separate `@repo/scanner/server`
 * entry point instead (same split as packages/auth's server.ts/
 * client.ts) — see that file's own comment.
 *
 * "Image → VisualSymbolId → Command → Domain Result" (API-SCANNER-
 * ACTION-001's own boundary line) splits at the embedding: everything
 * left of "already have a Float32Array embedding" is apps/mobile's
 * on-device vision pipeline (src/features/scanner/vision/); matching
 * and the event latch — pure, unit-tested here without a device — are
 * what this barrel exports. Dispatching a recognized command to a real
 * domain mutation needs a live DB connection, so that part is a server
 * concern (`@repo/scanner/server`), called over the network from
 * apps/mobile rather than in-process — this milestone doesn't add that
 * network route yet (disclosed scope boundary, same shape as several
 * other M09 gaps: see vision/model-store.ts, dinov2-encoder.ts).
 */
export {
  INITIAL_LATCH_STATUS,
  type LatchState,
  type LatchStatus,
  type LatchTickResult,
  tickLatch,
} from "./src/event-latch";
export {
  DEFAULT_INPUT_SIZE,
  IMAGENET_MEAN,
  IMAGENET_STD,
  InvalidPixelBufferError,
  resizeAndNormalize,
} from "./src/preprocess";
export {
  DEFAULT_SIMILARITY_THRESHOLD,
  recognize,
} from "./src/recognize";
export {
  computeCenteredSquareRoi,
  cropRgba,
  InvalidFrameDimensionsError,
  type RoiBounds,
} from "./src/roi";
export {
  cosineSimilarity,
  EmbeddingDimensionMismatchError,
} from "./src/similarity";
export {
  type LatencySummary,
  percentile,
  type ScanLatencyEvent,
  summarizeLatency,
  totalLatencyMs,
} from "./src/telemetry";
export {
  type CommandResult,
  type RecognitionResult,
  type RegisteredSymbol,
  type TaskCompletionMutation,
  V1_SYMBOL_IDS,
  V1_SYMBOL_TO_COMMAND,
  type VisualCommand,
  type VisualSymbolSemantic,
} from "./src/types";
