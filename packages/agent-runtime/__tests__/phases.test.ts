import { describe, expect, test } from "vitest";
import {
  AGENT_FLOW_PHASES,
  isDecomposePhase,
  REPLAN_RETURNS_TO,
} from "../src/phases";

describe("AGENT_FLOW_PHASES (M06-T01)", () => {
  test("matches AGENT-FLOW-001's capability order exactly, in order", () => {
    expect(AGENT_FLOW_PHASES).toEqual([
      "SYNC",
      "UNDERSTAND",
      "STRUCTURE",
      "VISUALIZE",
      "PRE_APPROVE",
      "DECOMPOSE",
      "EXECUTE",
      "RECONCILE",
      "REPORT",
      "REPLAN",
    ]);
  });

  test("isDecomposePhase only matches DECOMPOSE", () => {
    expect(isDecomposePhase("DECOMPOSE")).toBe(true);
    expect(isDecomposePhase("PRE_APPROVE")).toBe(false);
    expect(isDecomposePhase("REPLAN")).toBe(false);
  });

  test("REPLAN returns to the VISUALIZE gate, not straight to DECOMPOSE", () => {
    expect(REPLAN_RETURNS_TO).toBe("VISUALIZE");
    expect(REPLAN_RETURNS_TO).not.toBe("DECOMPOSE");
  });
});
