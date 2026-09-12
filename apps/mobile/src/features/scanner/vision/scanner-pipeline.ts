import {
  type CommandResult,
  type LatchStatus,
  type RegisteredSymbol,
  recognize,
  type ScanLatencyEvent,
  tickLatch,
} from "@repo/scanner";
import type { CameraView } from "expo-camera";
import { env } from "@/env";
import { captureFrame } from "./camera-frame-source";
import { encodeFrame } from "./dinov2-encoder";

export interface ScanTickResult {
  readonly commandResult: CommandResult | null;
  readonly detectedSymbolId: string | null;
  readonly latch: LatchStatus;
  readonly similarity: number | undefined;
  readonly telemetry: ScanLatencyEvent;
}

/**
 * One full pipeline cycle — CameraView → FrameSource → ROIExtractor →
 * ImagePreprocessor → VisualEncoder → SymbolMatcher → ScanEventLatch →
 * VisualCommandDispatcher (SPEC-SCANNER-001's exact stage order) — the
 * function apps/mobile's scanner screen calls on a fixed interval.
 * ROI extraction and preprocessing happen inside encodeFrame()
 * (dinov2-encoder.ts), which reuses packages/scanner's pure
 * cropRgba/resizeAndNormalize — this function only sequences the
 * stages and records the real telemetry timestamps SPEC-SCANNER-001
 * names (capturedAt/embeddingStartedAt/embeddingCompletedAt/matchedAt/
 * dispatchStartedAt/dispatchCompletedAt).
 *
 * Dispatch only happens on the latch's ENTER->FIRED transition — never
 * on every tick — per REQ-SCAN-005/ADR-SCANNER-001's edge-triggered
 * semantics. When it does dispatch, this calls apps/api's
 * /scanner/dispatch route (packages/scanner/server.ts's dispatch()
 * needs a live DB connection this on-device code doesn't have — see
 * that file's own comment).
 */
export const runScanTick = async (
  cameraRef: CameraView,
  registeredSymbols: readonly RegisteredSymbol[],
  latchStatus: LatchStatus,
  sessionToken: string
): Promise<ScanTickResult> => {
  const frame = await captureFrame(cameraRef);
  const embeddingStartedAt = Date.now();
  const embedding = await encodeFrame(frame.base64);
  const embeddingCompletedAt = Date.now();

  const recognition = recognize(embedding, registeredSymbols);
  const matchedAt = Date.now();
  const detectedSymbolId =
    recognition.status === "RECOGNIZED" ? recognition.symbolId : null;

  const tick = tickLatch(latchStatus, detectedSymbolId);

  let dispatchStartedAt = matchedAt;
  let dispatchCompletedAt = matchedAt;
  let commandResult: CommandResult | null = null;

  if (tick.shouldDispatch && detectedSymbolId) {
    dispatchStartedAt = Date.now();
    commandResult = await postDispatch(detectedSymbolId, sessionToken);
    dispatchCompletedAt = Date.now();
  }

  return {
    latch: tick.next,
    detectedSymbolId,
    similarity:
      recognition.status === "RECOGNIZED" || recognition.status === "UNKNOWN"
        ? recognition.similarity
        : undefined,
    telemetry: {
      capturedAt: frame.capturedAt,
      embeddingStartedAt,
      embeddingCompletedAt,
      matchedAt,
      dispatchStartedAt,
      dispatchCompletedAt,
    },
    commandResult,
  };
};

class DispatchRequestFailedError extends Error {
  constructor(status: number, body: string) {
    super(`/scanner/dispatch failed: HTTP ${status} ${body}`);
    this.name = "DispatchRequestFailedError";
  }
}

const postDispatch = async (
  symbolId: string,
  sessionToken: string
): Promise<CommandResult> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(
    new URL("/scanner/dispatch", env.EXPO_PUBLIC_API_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ symbolId }),
    }
  );
  if (!response.ok) {
    throw new DispatchRequestFailedError(
      response.status,
      await response.text()
    );
  }
  return (await response.json()) as CommandResult;
};
