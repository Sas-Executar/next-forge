/**
 * Latency instrumentation (M09-T05). Field names match
 * SPEC-SCANNER-001's own "Performance and telemetry" section exactly
 * (capturedAt/embeddingStartedAt/embeddingCompletedAt/matchedAt/
 * dispatchStartedAt/dispatchCompletedAt) — real timestamps captured at
 * each pipeline stage boundary (apps/mobile's vision/ pipeline calls
 * into this as each stage finishes); p50/p95 computed here from
 * whatever series of real durations has actually been recorded.
 *
 * Both SPEC-SCANNER-001 and PRD-SCANNER-001 state the same thing
 * almost verbatim: "meta de produto declarada na fonte: scan-to-command
 * p95 <= 500ms; ainda não verificada" — the Blueprint's own text
 * already discloses this target is unverified. This module supplies
 * the real measurement machinery, but produces no number of its own —
 * nothing in this package or repo has run the on-device pipeline (no
 * physical device in this sandbox), so no p50/p95 value exists yet to
 * report. Any actual latency figure has to come from a real device
 * run; fabricating one here would be exactly the kind of unverified
 * claim the plan explicitly warns against.
 */
export interface ScanLatencyEvent {
  readonly capturedAt: number;
  readonly dispatchCompletedAt: number;
  readonly dispatchStartedAt: number;
  readonly embeddingCompletedAt: number;
  readonly embeddingStartedAt: number;
  readonly matchedAt: number;
}

export const totalLatencyMs = (event: ScanLatencyEvent): number =>
  event.dispatchCompletedAt - event.capturedAt;

export class EmptyLatencySampleError extends Error {
  constructor() {
    super("Cannot compute a percentile over an empty latency sample.");
    this.name = "EmptyLatencySampleError";
  }
}

/**
 * Nearest-rank percentile over a real sample of durations — no
 * interpolation, so the returned value is always one of the actual
 * recorded durations (a defensible, simple choice for a small sample;
 * revisit if/when M09 accumulates enough on-device data for
 * interpolated percentiles to matter).
 */
export const percentile = (
  durationsMs: readonly number[],
  p: number
): number => {
  if (durationsMs.length === 0) {
    throw new EmptyLatencySampleError();
  }
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const clampedRank = Math.min(Math.max(rank, 0), sorted.length - 1);
  return sorted[clampedRank] as number;
};

export interface LatencySummary {
  readonly count: number;
  readonly maxMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
}

export const summarizeLatency = (
  events: readonly ScanLatencyEvent[]
): LatencySummary => {
  const durations = events.map(totalLatencyMs);
  return {
    count: durations.length,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    maxMs: Math.max(...durations),
  };
};
