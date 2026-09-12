import { describe, expect, it } from "vitest";
import {
  EmptyLatencySampleError,
  percentile,
  type ScanLatencyEvent,
  summarizeLatency,
  totalLatencyMs,
} from "../src/telemetry";

const makeEvent = (totalMs: number): ScanLatencyEvent => ({
  capturedAt: 0,
  embeddingStartedAt: totalMs * 0.1,
  embeddingCompletedAt: totalMs * 0.7,
  matchedAt: totalMs * 0.8,
  dispatchStartedAt: totalMs * 0.9,
  dispatchCompletedAt: totalMs,
});

describe("totalLatencyMs", () => {
  it("is dispatchCompletedAt minus capturedAt", () => {
    expect(totalLatencyMs(makeEvent(420))).toBe(420);
  });
});

describe("percentile", () => {
  it("computes a nearest-rank p50 over a known sample", () => {
    expect(percentile([100, 200, 300, 400, 500], 50)).toBe(300);
  });

  it("computes a nearest-rank p95 over a known sample", () => {
    // 20-element sample: ceil(0.95 * 20) - 1 = 18 (0-indexed) => the 19th value.
    const sample = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);
    expect(percentile(sample, 95)).toBe(190);
  });

  it("throws EmptyLatencySampleError for an empty sample", () => {
    expect(() => percentile([], 50)).toThrow(EmptyLatencySampleError);
  });

  it("returns the single value for a one-element sample", () => {
    expect(percentile([250], 95)).toBe(250);
  });
});

describe("summarizeLatency", () => {
  it("summarizes a real sample of events, never fabricating a number for an empty one", () => {
    const events = [
      makeEvent(300),
      makeEvent(450),
      makeEvent(600),
      makeEvent(200),
    ];
    const summary = summarizeLatency(events);
    expect(summary.count).toBe(4);
    expect(summary.maxMs).toBe(600);
    expect(summary.p50Ms).toBeGreaterThan(0);
    expect(summary.p95Ms).toBeGreaterThanOrEqual(summary.p50Ms);
  });

  it("throws rather than returning a fabricated summary for zero events", () => {
    expect(() => summarizeLatency([])).toThrow(EmptyLatencySampleError);
  });
});
