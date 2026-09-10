import { describe, expect, test } from "vitest";
import { estimateCostUsd } from "../ai-pricing";

describe("estimateCostUsd (OBS-006, real OpenAI pricing snapshot)", () => {
  test("gpt-4o-mini: 1M input + 1M output tokens costs $0.15 + $0.60", () => {
    expect(estimateCostUsd("gpt-4o-mini", 1_000_000, 1_000_000)).toBeCloseTo(
      0.75,
      6
    );
  });

  test("gpt-4o: 1M input + 1M output tokens costs $2.50 + $10.00", () => {
    expect(estimateCostUsd("gpt-4o", 1_000_000, 1_000_000)).toBeCloseTo(
      12.5,
      6
    );
  });

  test("zero tokens costs zero for a known model", () => {
    expect(estimateCostUsd("gpt-4o-mini", 0, 0)).toBe(0);
  });

  test("an unknown model returns null rather than guessing a price", () => {
    expect(estimateCostUsd("some-future-model", 100, 100)).toBeNull();
  });
});
