import {
  type ActorType,
  type AuthorityDecision,
  TASK_STATE_TRANSITIONS,
  type TaskState,
} from "@repo/schemas";

/**
 * Task transition guard — the one state machine in this file where
 * `actor` actually gates the decision, per SPEC-ROUTINES-001 §7's
 * AuthorityGate baseline (Blueprint, read-only): auto-allow
 * `BACKLOG_VALIDATED → READY`; `→DOING`, `→VERIFY`, `→DONE` are
 * HUMAN_REQUIRED regardless of structural legality. Marking `BLOCKED` is
 * always allowed (a safety valve — blocking never over-promotes);
 * unblocking requires the same authority as the transition it resumes.
 *
 * Pure and I/O-free by design (plan §4, M02-T04): this does not check
 * evidence, dependencies, or capacity — "'feito' não substitui
 * evidência" is enforced by the EligibilityEngine (packages/application,
 * M04), which has the I/O this function deliberately doesn't.
 */
export const canTransitionTask = (
  from: TaskState,
  to: TaskState,
  actor: ActorType
): AuthorityDecision => {
  const structurallyLegal = TASK_STATE_TRANSITIONS[from].includes(to);
  if (!structurallyLegal) {
    return "BLOCK";
  }

  if (to === "BLOCKED") {
    return "ALLOW";
  }

  if (actor === "USER") {
    return "ALLOW";
  }

  // AGENT / SYSTEM: only the auto-allowed promotions.
  const autoAllowedForAgent: readonly TaskState[] = ["READY"];
  return autoAllowedForAgent.includes(to) ? "ALLOW" : "HUMAN_REQUIRED";
};
