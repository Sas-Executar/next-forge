import type { TaskState } from "@repo/schemas";

export interface EligibilityContext {
  taskState: TaskState;
  /** States of the tasks this one depends on (Dependency.toTaskId -> Task.state). */
  dependencyStates: ReadonlyMap<string, TaskState>;
  /** Is another task already DOING in this scope? WIP=1. */
  wipTaskInProgress: boolean;
  /**
   * Estimated effort for this task and time actually available right
   * now, when known. Neither is derived from a schema field today — no
   * duration-estimation source exists yet anywhere in this repo (Task
   * has no duration column; only Action.expectedDuration does, and
   * eligibility is evaluated at Task granularity, which owns the state
   * machine and the WIP=1 invariant). When either is undefined this
   * clause is skipped, not silently treated as satisfied.
   */
  estimatedDurationMinutes?: number;
  availableCapacityMinutes?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  /** Non-empty exactly when eligible is false — every rejection is explained, never silent. */
  reasons: string[];
}

/**
 * SPEC-ROUTINES-001 §6 pseudocode (Blueprint, read-only):
 *   eligible(action) = dependency_state==READY AND hard_constraints
 *     satisfied AND duration<=available_capacity AND wip_rule satisfied
 *
 * Generalized beyond routines to manual execution (plan M04-T01): the
 * spec's "action" maps to Task here, since Task owns the canonical
 * state machine (packages/schemas/src/task-state.ts) and the WIP=1
 * invariant this repo enforces at Task granularity, not Action.
 * "hard_constraints" has no further Blueprint-specified content beyond
 * dependencies + WIP + capacity — there is nothing else to check here
 * yet.
 *
 * Pure, no I/O — operates on already-resolved context; next-action.ts
 * does the DB fetching per candidate and calls this to filter.
 */
export const evaluateEligibility = (
  ctx: EligibilityContext
): EligibilityResult => {
  const reasons: string[] = [];

  if (ctx.taskState !== "READY") {
    reasons.push(`task is ${ctx.taskState}, not READY`);
  }

  for (const [toTaskId, state] of ctx.dependencyStates) {
    if (state !== "DONE") {
      reasons.push(`dependency ${toTaskId} is ${state}, not DONE`);
    }
  }

  // WIP=1 (skills/copiloto-executar/SKILL.md — "WIP é 1 entrega → 1
  // fluxo → 1 ação"; ADR-ROUTINES-001 invariant 3 — "WIP=1 permanece
  // regra padrão do modo EXECUTAR").
  if (ctx.wipTaskInProgress) {
    reasons.push("another task is already DOING (WIP=1)");
  }

  if (
    ctx.estimatedDurationMinutes !== undefined &&
    ctx.availableCapacityMinutes !== undefined &&
    ctx.estimatedDurationMinutes > ctx.availableCapacityMinutes
  ) {
    reasons.push(
      `estimated ${ctx.estimatedDurationMinutes}min exceeds available ${ctx.availableCapacityMinutes}min`
    );
  }

  return { eligible: reasons.length === 0, reasons };
};
