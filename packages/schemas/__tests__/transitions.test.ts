import { describe, expect, test } from "vitest";
import {
  DELIVERY_STATUS_TRANSITIONS,
  type DeliveryStatus,
  deliveryStatusSchema,
  ROUTINE_STATUS_TRANSITIONS,
  type RoutineStatus,
  RUN_STATUS_TRANSITIONS,
  type RunStatus,
  routineStatusSchema,
  runStatusSchema,
} from "../src/routine";
import {
  TASK_STATE_LABEL_PT,
  TASK_STATE_TRANSITIONS,
  type TaskState,
  taskStateSchema,
} from "../src/task-state";

/**
 * M17-T02 — packages/schemas had zero test coverage despite defining
 * four real transition tables every other package's state machine
 * either reuses directly (packages/domain's canTransitionTask,
 * packages/routines' pipeline) or must stay in lockstep with by hand
 * (schema.prisma's enums, per each file's own D9 comment). These are
 * structural invariant checks over the tables themselves — every state
 * they cite is a real key of the table, and terminal states really have
 * no way out — not a re-test of the actor-gating logic packages/domain
 * already covers.
 */
const assertClosedTransitionTable = <T extends string>(
  table: Readonly<Record<T, readonly T[]>>
) => {
  const states = new Set(Object.keys(table));
  for (const [from, targets] of Object.entries(table) as [T, readonly T[]][]) {
    for (const to of targets) {
      // biome-ignore lint/suspicious/noMisplacedAssertion: helper called only from inside test() bodies below
      expect(
        states.has(to),
        `${from} → ${to}: "${to}" is not a key of this transition table`
      ).toBe(true);
      // biome-ignore lint/suspicious/noMisplacedAssertion: helper called only from inside test() bodies below
      expect(
        to,
        `${from} → ${from}: no transition should be a self-loop`
      ).not.toBe(from);
    }
  }
};

describe("TASK_STATE_TRANSITIONS", () => {
  test("every cited target state is a real TaskState", () => {
    assertClosedTransitionTable<TaskState>(TASK_STATE_TRANSITIONS);
  });

  test("DONE is terminal — no outgoing transitions", () => {
    expect(TASK_STATE_TRANSITIONS.DONE).toEqual([]);
  });

  test("BLOCKED is reachable from every non-terminal state", () => {
    const nonTerminal = Object.keys(TASK_STATE_TRANSITIONS).filter(
      (state) => state !== "DONE" && state !== "BLOCKED"
    ) as TaskState[];
    for (const state of nonTerminal) {
      expect(TASK_STATE_TRANSITIONS[state]).toContain("BLOCKED");
    }
  });

  test("BLOCKED can return to every state it can be reached from", () => {
    for (const state of Object.keys(TASK_STATE_TRANSITIONS) as TaskState[]) {
      if (
        state !== "BLOCKED" &&
        TASK_STATE_TRANSITIONS[state].includes("BLOCKED")
      ) {
        expect(TASK_STATE_TRANSITIONS.BLOCKED).toContain(state);
      }
    }
  });

  test("TASK_STATE_LABEL_PT has exactly one PT-BR label per TaskState, none empty", () => {
    const states = Object.keys(TASK_STATE_TRANSITIONS) as TaskState[];
    expect(Object.keys(TASK_STATE_LABEL_PT).sort()).toEqual([...states].sort());
    for (const state of states) {
      expect(TASK_STATE_LABEL_PT[state].length).toBeGreaterThan(0);
    }
  });

  test("taskStateSchema accepts every TASK_STATE_TRANSITIONS key and rejects an unknown value", () => {
    for (const state of Object.keys(TASK_STATE_TRANSITIONS)) {
      expect(taskStateSchema.safeParse(state).success).toBe(true);
    }
    expect(taskStateSchema.safeParse("NOT_A_STATE").success).toBe(false);
  });
});

describe("ROUTINE_STATUS_TRANSITIONS", () => {
  test("every cited target state is a real RoutineStatus", () => {
    assertClosedTransitionTable<RoutineStatus>(ROUTINE_STATUS_TRANSITIONS);
  });

  test("DISABLED is terminal — no outgoing transitions", () => {
    expect(ROUTINE_STATUS_TRANSITIONS.DISABLED).toEqual([]);
  });

  test("ENABLED and PAUSED can toggle between each other", () => {
    expect(ROUTINE_STATUS_TRANSITIONS.ENABLED).toContain("PAUSED");
    expect(ROUTINE_STATUS_TRANSITIONS.PAUSED).toContain("ENABLED");
  });

  test("routineStatusSchema round-trips every table key", () => {
    for (const status of Object.keys(ROUTINE_STATUS_TRANSITIONS)) {
      expect(routineStatusSchema.safeParse(status).success).toBe(true);
    }
  });
});

describe("RUN_STATUS_TRANSITIONS", () => {
  const terminal: readonly RunStatus[] = [
    "SUCCESS",
    "PARTIAL",
    "BLOCKED",
    "FAILED",
  ];

  test("every cited target state is a real RunStatus", () => {
    assertClosedTransitionTable<RunStatus>(RUN_STATUS_TRANSITIONS);
  });

  test("every terminal outcome has no outgoing transitions (no reopened runs — SPEC-ROUTINES-001 §9 idempotency)", () => {
    for (const status of terminal) {
      expect(RUN_STATUS_TRANSITIONS[status]).toEqual([]);
    }
  });

  test("runStatusSchema round-trips every table key", () => {
    for (const status of Object.keys(RUN_STATUS_TRANSITIONS)) {
      expect(runStatusSchema.safeParse(status).success).toBe(true);
    }
  });
});

describe("DELIVERY_STATUS_TRANSITIONS", () => {
  test("every cited target state is a real DeliveryStatus", () => {
    assertClosedTransitionTable<DeliveryStatus>(DELIVERY_STATUS_TRANSITIONS);
  });

  test("DELIVERED and FAILED are terminal", () => {
    expect(DELIVERY_STATUS_TRANSITIONS.DELIVERED).toEqual([]);
    expect(DELIVERY_STATUS_TRANSITIONS.FAILED).toEqual([]);
  });

  test("PENDING can fail directly, without going through SENT", () => {
    expect(DELIVERY_STATUS_TRANSITIONS.PENDING).toContain("FAILED");
  });

  test("deliveryStatusSchema round-trips every table key", () => {
    for (const status of Object.keys(DELIVERY_STATUS_TRANSITIONS)) {
      expect(deliveryStatusSchema.safeParse(status).success).toBe(true);
    }
  });
});
