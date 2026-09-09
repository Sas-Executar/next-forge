import { forWorkspace } from "@repo/database";
import type { Task } from "@repo/database";
import { datesEqual, rankEligibleTasks } from "./rank-eligible-tasks";

export type NextActionResult =
  | { kind: "SELECTED"; task: Task; reason: string }
  | { kind: "TIE"; candidates: Task[] }
  | { kind: "NONE" };

/**
 * Best Next Action selection (M04-T02), WIP=1. Precedence per
 * skills/copiloto-executar/SKILL.md (Blueprint, read-only) — "Dependência
 * sempre vence agrupamento cognitivo" and "dependência → criticidade →
 * ciclo atual → entregável atual → contexto cognitivo" (documented
 * there for the Copilot's own ranking; reused here as the closest
 * precedence chain the Blueprint gives, since SPEC-ROUTINES-001 §6
 * specifies the eligibility predicate but not a full tie-break order).
 *
 * Implemented tiers, in order (see rank-eligible-tasks.ts for the actual
 * ranking — shared with /sprint, M05-T01):
 *  1. Eligibility (dependencies DONE, WIP=1) — a hard filter, not a
 *     ranking signal. See eligibility.ts.
 *  2. Criticality proxy: how many other tasks this one's completion
 *     unblocks (count of Dependency rows pointing at it, across the
 *     whole workspace — not just among candidates, since a task can
 *     unblock work that isn't itself READY yet). Higher wins. A real,
 *     computed signal from the actual dependency graph.
 *  3. Nearest deliverable deadline (Deliverable.dueDate). Earlier wins;
 *     tasks with no deliverable or no due date rank last on this tier,
 *     not excluded.
 *
 * NOT implemented (no data model support exists for these yet — not
 * faked with a placeholder signal):
 *  - "value" priority — no priority/value field exists on Task.
 *  - cognitive-context similarity (Schema Metodos e evidecnias.md
 *    SCHEMA 04) — no context tagging exists anywhere in this schema.
 *
 * A true tie after the implemented tiers returns `{ kind: "TIE" }` —
 * per the skill's own rule, an unresolved tie is EXIGE_HUMANO
 * (packages/schemas' AuthorityDecision), not a silent pick.
 */
export const nextAction = async (
  workspaceId: string
): Promise<NextActionResult> => {
  const db = forWorkspace(workspaceId);

  const wipTask = await db.task.findFirst({ where: { state: "DOING" } });
  if (wipTask) {
    // WIP=1 already spent — the "next action" IS the in-progress one.
    return {
      kind: "SELECTED",
      task: wipTask,
      reason: "already in progress (WIP=1)",
    };
  }

  const ranked = await rankEligibleTasks(workspaceId);
  if (ranked.length === 0) {
    return { kind: "NONE" };
  }

  const winner = ranked[0];
  const tiedWithWinner = ranked.filter(
    (candidate) =>
      candidate.criticality === winner.criticality &&
      datesEqual(candidate.dueDate, winner.dueDate)
  );

  if (tiedWithWinner.length > 1) {
    return { kind: "TIE", candidates: tiedWithWinner.map((c) => c.task) };
  }

  return {
    kind: "SELECTED",
    task: winner.task,
    reason: "highest-ranked eligible task",
  };
};
