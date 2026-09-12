import { describe, expect, test } from "vitest";
import { newSpanId, newTraceId, traceEnvelopeSchema } from "../trace";

describe("traceEnvelopeSchema (OBS-002 §2)", () => {
  test("accepts a minimal valid envelope, defaulting nullable fields", () => {
    const parsed = traceEnvelopeSchema.parse({
      traceId: "t1",
      spanId: "s1",
      occurredAt: new Date().toISOString(),
      component: "test",
      eventName: "test.event",
      outcome: "success",
    });
    expect(parsed.parentSpanId).toBeNull();
    expect(parsed.workspaceId).toBeNull();
    expect(parsed.outcome).toBe("success");
  });

  test("rejects an outcome outside OBS-002's 4 literal values", () => {
    const result = traceEnvelopeSchema.safeParse({
      traceId: "t1",
      spanId: "s1",
      occurredAt: new Date().toISOString(),
      component: "test",
      eventName: "test.event",
      outcome: "ok", // not one of success|partial|blocked|error
    });
    expect(result.success).toBe(false);
  });
});

describe("newTraceId/newSpanId", () => {
  test("each call produces a distinct id", () => {
    expect(newTraceId()).not.toBe(newTraceId());
    expect(newSpanId()).not.toBe(newSpanId());
  });
});
