import { describe, expect, test } from "vitest";
import {
  SCROLL_TASK_TRANSITIONS,
  scrollTaskScopeSchema,
  scrollTaskStateSchema,
  scrollTaskTimerMinutesSchema,
  scrollTaskUnitSchema,
} from "../src/scroll-task";

describe("scrollTaskScopeSchema", () => {
  test("accepts the 4 documented scopes and rejects an unknown value", () => {
    for (const scope of ["action", "task", "phase", "workflow"] as const) {
      expect(scrollTaskScopeSchema.safeParse(scope).success).toBe(true);
    }
    expect(scrollTaskScopeSchema.safeParse("project").success).toBe(false);
  });
});

describe("scrollTaskTimerMinutesSchema", () => {
  test("accepts only 15, 30, 45", () => {
    for (const minutes of [15, 30, 45]) {
      expect(scrollTaskTimerMinutesSchema.safeParse(minutes).success).toBe(
        true
      );
    }
  });

  test("rejects any other value, including a plausible-but-unsupported one", () => {
    expect(scrollTaskTimerMinutesSchema.safeParse(20).success).toBe(false);
    expect(scrollTaskTimerMinutesSchema.safeParse(60).success).toBe(false);
    expect(scrollTaskTimerMinutesSchema.safeParse(0).success).toBe(false);
  });
});

describe("scrollTaskUnitSchema", () => {
  test("accepts a minimal valid unit", () => {
    const result = scrollTaskUnitSchema.safeParse({
      refId: "task_1",
      scope: "task",
      titulo: "Responder cliente",
    });
    expect(result.success).toBe(true);
  });
});

describe("scrollTaskStateSchema / SCROLL_TASK_TRANSITIONS", () => {
  test("accepts every documented state and rejects an unknown value", () => {
    for (const state of Object.keys(SCROLL_TASK_TRANSITIONS)) {
      expect(scrollTaskStateSchema.safeParse(state).success).toBe(true);
    }
    expect(scrollTaskStateSchema.safeParse("paused").success).toBe(false);
  });

  test("completed and deferred are terminal", () => {
    expect(SCROLL_TASK_TRANSITIONS.completed).toEqual([]);
    expect(SCROLL_TASK_TRANSITIONS.deferred).toEqual([]);
  });

  test("idle can only reach running — no shortcut to completed/expanded", () => {
    expect(SCROLL_TASK_TRANSITIONS.idle).toEqual(["running"]);
  });

  test("timer_elapsed can reach completed/deferred (user-driven) as well as resume to running", () => {
    expect(SCROLL_TASK_TRANSITIONS.timer_elapsed).toEqual(
      expect.arrayContaining(["running", "completed", "deferred"])
    );
  });
});
