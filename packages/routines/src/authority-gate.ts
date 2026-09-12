import { canTransitionTask } from "@repo/domain";
import type { AuthorityDecision, TaskState } from "@repo/schemas";

export type MutationRequest =
  | { readonly type: "sync_mirror" }
  | {
      readonly type: "task_transition";
      readonly from: TaskState;
      readonly to: TaskState;
    };

/**
 * AuthorityGate baseline (§7). `sync_mirror` is always ALLOW (it only
 * mirrors an external authority's state into our store, no promotion
 * involved). Every Task state transition reuses canTransitionTask's
 * actor="AGENT" baseline (packages/domain, already built for M04/M06) —
 * that function encodes exactly the table §7 states in prose
 * (BACKLOG_VALIDATED→READY: ALLOW when structurally legal; →DOING/
 * →VERIFY/→DONE and beyond: HUMAN_REQUIRED) — one definition, reused
 * here rather than a second copy of the same rule.
 */
export const evaluateMutationAuthority = (
  request: MutationRequest
): AuthorityDecision => {
  if (request.type === "sync_mirror") {
    return "ALLOW";
  }
  return canTransitionTask(request.from, request.to, "AGENT");
};
