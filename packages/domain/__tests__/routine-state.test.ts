import { describe, expect, test } from "vitest";
import {
  canTransitionDeliveryStatus,
  canTransitionRoutineStatus,
  canTransitionRunStatus,
} from "../src/routine-state";

describe("canTransitionRoutineStatus (config lifecycle)", () => {
  test.each([
    ["DRAFT", "ENABLED"],
    ["ENABLED", "PAUSED"],
    ["ENABLED", "DISABLED"],
    ["PAUSED", "ENABLED"],
    ["PAUSED", "DISABLED"],
  ] as const)("%s -> %s is legal", (from, to) => {
    expect(canTransitionRoutineStatus(from, to)).toBe(true);
  });

  test.each([
    ["DRAFT", "PAUSED"], // must go through ENABLED first
    ["DRAFT", "DISABLED"],
    ["DISABLED", "ENABLED"], // DISABLED is terminal
    ["DISABLED", "DRAFT"],
  ] as const)("%s -> %s is illegal", (from, to) => {
    expect(canTransitionRoutineStatus(from, to)).toBe(false);
  });
});

describe("canTransitionRunStatus (per-run lifecycle)", () => {
  test.each([
    ["SCHEDULED", "RUNNING"],
    ["RUNNING", "SUCCESS"],
    ["RUNNING", "PARTIAL"],
    ["RUNNING", "BLOCKED"],
    ["RUNNING", "FAILED"],
  ] as const)("%s -> %s is legal", (from, to) => {
    expect(canTransitionRunStatus(from, to)).toBe(true);
  });

  test.each([
    ["SCHEDULED", "SUCCESS"], // must go through RUNNING
    ["SUCCESS", "RUNNING"], // terminal, no reopening a run
    ["FAILED", "RUNNING"],
    ["PARTIAL", "SUCCESS"],
  ] as const)("%s -> %s is illegal", (from, to) => {
    expect(canTransitionRunStatus(from, to)).toBe(false);
  });
});

describe("canTransitionDeliveryStatus (per-channel delivery lifecycle)", () => {
  test.each([
    ["PENDING", "SENT"],
    ["PENDING", "FAILED"], // direct fail before send (e.g. invalid recipient)
    ["SENT", "DELIVERED"],
    ["SENT", "FAILED"],
  ] as const)("%s -> %s is legal", (from, to) => {
    expect(canTransitionDeliveryStatus(from, to)).toBe(true);
  });

  test.each([
    ["PENDING", "DELIVERED"], // must go through SENT
    ["DELIVERED", "FAILED"], // terminal
    ["FAILED", "SENT"],
  ] as const)("%s -> %s is illegal", (from, to) => {
    expect(canTransitionDeliveryStatus(from, to)).toBe(false);
  });
});
