import { describe, expect, test } from "vitest";
import { canTransitionTask } from "../src/task-state";

// Every legal structural transition is ALLOW for a human actor.
describe("canTransitionTask — structural legality (actor: USER)", () => {
  test.each([
    ["BACKLOG_VALIDATED", "READY"],
    ["READY", "DOING"],
    ["DOING", "VERIFY"],
    ["VERIFY", "DONE"],
    ["VERIFY", "DOING"],
    ["BACKLOG_VALIDATED", "BLOCKED"],
    ["READY", "BLOCKED"],
    ["DOING", "BLOCKED"],
    ["VERIFY", "BLOCKED"],
    ["BLOCKED", "BACKLOG_VALIDATED"],
    ["BLOCKED", "READY"],
    ["BLOCKED", "DOING"],
    ["BLOCKED", "VERIFY"],
  ] as const)("%s -> %s is ALLOW", (from, to) => {
    expect(canTransitionTask(from, to, "USER")).toBe("ALLOW");
  });

  test.each([
    ["DONE", "READY"],
    ["BACKLOG_VALIDATED", "DONE"],
    ["BACKLOG_VALIDATED", "VERIFY"],
    ["READY", "VERIFY"],
    ["DONE", "DOING"],
  ] as const)("%s -> %s is BLOCK (not a legal edge, regardless of actor)", (from, to) => {
    expect(canTransitionTask(from, to, "USER")).toBe("BLOCK");
    expect(canTransitionTask(from, to, "AGENT")).toBe("BLOCK");
  });
});

// AuthorityGate baseline (SPEC-ROUTINES-001 §7): agents may only
// auto-promote into READY or BLOCKED; DOING/VERIFY/DONE require a human,
// whether reached directly or by unblocking back into them.
describe("canTransitionTask — AuthorityGate (actor: AGENT / SYSTEM)", () => {
  test.each([
    "AGENT",
    "SYSTEM",
  ] as const)("%s: BACKLOG_VALIDATED -> READY is ALLOW", (actor) => {
    expect(canTransitionTask("BACKLOG_VALIDATED", "READY", actor)).toBe(
      "ALLOW"
    );
  });

  test.each([
    "AGENT",
    "SYSTEM",
  ] as const)("%s: BLOCKED -> READY is ALLOW", (actor) => {
    expect(canTransitionTask("BLOCKED", "READY", actor)).toBe("ALLOW");
  });

  test.each([
    ["READY", "DOING"],
    ["DOING", "VERIFY"],
    ["VERIFY", "DONE"],
    ["VERIFY", "DOING"],
  ] as const)("AGENT: %s -> %s is HUMAN_REQUIRED", (from, to) => {
    expect(canTransitionTask(from, to, "AGENT")).toBe("HUMAN_REQUIRED");
  });

  test.each([
    ["BLOCKED", "DOING"],
    ["BLOCKED", "VERIFY"],
  ] as const)("AGENT: unblocking into %s -> %s is HUMAN_REQUIRED, not auto-resumed", (from, to) => {
    expect(canTransitionTask(from, to, "AGENT")).toBe("HUMAN_REQUIRED");
  });

  test.each([
    ["BACKLOG_VALIDATED", "BLOCKED"],
    ["READY", "BLOCKED"],
    ["DOING", "BLOCKED"],
    ["VERIFY", "BLOCKED"],
  ] as const)("AGENT: %s -> %s is ALLOW (marking BLOCKED never over-promotes)", (from, to) => {
    expect(canTransitionTask(from, to, "AGENT")).toBe("ALLOW");
  });
});
