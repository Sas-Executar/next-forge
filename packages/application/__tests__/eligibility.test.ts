import { describe, expect, test } from "vitest";
import { evaluateEligibility } from "../src/eligibility";

describe("evaluateEligibility", () => {
  test("READY task, no dependencies, no WIP conflict is eligible", () => {
    const result = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map(),
      wipTaskInProgress: false,
    });
    expect(result).toEqual({ eligible: true, reasons: [] });
  });

  test.each([
    "BACKLOG_VALIDATED",
    "DOING",
    "VERIFY",
    "DONE",
    "BLOCKED",
  ] as const)("%s task is not eligible", (taskState) => {
    const result = evaluateEligibility({
      taskState,
      dependencyStates: new Map(),
      wipTaskInProgress: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain(`task is ${taskState}, not READY`);
  });

  test("all dependencies DONE is eligible", () => {
    const result = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map([
        ["dep-1", "DONE"],
        ["dep-2", "DONE"],
      ]),
      wipTaskInProgress: false,
    });
    expect(result.eligible).toBe(true);
  });

  test("an incomplete dependency blocks eligibility and is named in reasons", () => {
    const result = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map([
        ["dep-1", "DONE"],
        ["dep-2", "DOING"],
      ]),
      wipTaskInProgress: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(["dependency dep-2 is DOING, not DONE"]);
  });

  test("multiple incomplete dependencies are each named", () => {
    const result = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map([
        ["dep-1", "BACKLOG_VALIDATED"],
        ["dep-2", "BLOCKED"],
      ]),
      wipTaskInProgress: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toHaveLength(2);
  });

  test("WIP=1 conflict blocks eligibility", () => {
    const result = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map(),
      wipTaskInProgress: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(["another task is already DOING (WIP=1)"]);
  });

  test("estimated duration within capacity is eligible", () => {
    const result = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map(),
      wipTaskInProgress: false,
      estimatedDurationMinutes: 30,
      availableCapacityMinutes: 60,
    });
    expect(result.eligible).toBe(true);
  });

  test("estimated duration exceeding capacity blocks eligibility", () => {
    const result = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map(),
      wipTaskInProgress: false,
      estimatedDurationMinutes: 90,
      availableCapacityMinutes: 60,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(["estimated 90min exceeds available 60min"]);
  });

  test("duration exactly equal to capacity is eligible (<=, not <)", () => {
    const result = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map(),
      wipTaskInProgress: false,
      estimatedDurationMinutes: 60,
      availableCapacityMinutes: 60,
    });
    expect(result.eligible).toBe(true);
  });

  test("capacity clause is skipped, not satisfied-by-default, when either side is unknown", () => {
    const durationOnly = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map(),
      wipTaskInProgress: false,
      estimatedDurationMinutes: 999,
    });
    expect(durationOnly.eligible).toBe(true);

    const capacityOnly = evaluateEligibility({
      taskState: "READY",
      dependencyStates: new Map(),
      wipTaskInProgress: false,
      availableCapacityMinutes: 1,
    });
    expect(capacityOnly.eligible).toBe(true);
  });

  test("multiple failing clauses are all reported together", () => {
    const result = evaluateEligibility({
      taskState: "DOING",
      dependencyStates: new Map([["dep-1", "READY"]]),
      wipTaskInProgress: true,
      estimatedDurationMinutes: 120,
      availableCapacityMinutes: 30,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toHaveLength(4);
  });
});
