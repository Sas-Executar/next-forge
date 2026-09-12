import { describe, expect, test } from "vitest";
import { evaluateMutationAuthority } from "../src/authority-gate";

describe("evaluateMutationAuthority (M10-T02, §7 AuthorityGate baseline)", () => {
  test("sync_mirror is always ALLOW", () => {
    expect(evaluateMutationAuthority({ type: "sync_mirror" })).toBe("ALLOW");
  });

  test("BACKLOG_VALIDATED -> READY is ALLOW", () => {
    expect(
      evaluateMutationAuthority({
        type: "task_transition",
        from: "BACKLOG_VALIDATED",
        to: "READY",
      })
    ).toBe("ALLOW");
  });

  test("-> DOING is HUMAN_REQUIRED, never auto-executed", () => {
    expect(
      evaluateMutationAuthority({
        type: "task_transition",
        from: "READY",
        to: "DOING",
      })
    ).toBe("HUMAN_REQUIRED");
  });

  test("-> VERIFY is HUMAN_REQUIRED", () => {
    expect(
      evaluateMutationAuthority({
        type: "task_transition",
        from: "DOING",
        to: "VERIFY",
      })
    ).toBe("HUMAN_REQUIRED");
  });

  test("-> DONE is HUMAN_REQUIRED — the routine engine can never promote to DONE on its own", () => {
    expect(
      evaluateMutationAuthority({
        type: "task_transition",
        from: "VERIFY",
        to: "DONE",
      })
    ).toBe("HUMAN_REQUIRED");
  });

  test("a structurally illegal transition is BLOCK, not HUMAN_REQUIRED", () => {
    expect(
      evaluateMutationAuthority({
        type: "task_transition",
        from: "DONE",
        to: "DOING",
      })
    ).toBe("BLOCK");
  });
});
