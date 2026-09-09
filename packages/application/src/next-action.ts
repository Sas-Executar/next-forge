import { forWorkspace } from "@repo/database";
import type { Task } from "@repo/database";
import { evaluateEligibility } from "./eligibility";

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
 * Implemented tiers, in order:
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

  const candidates = await db.task.findMany({
    where: { state: "READY" },
    include: {
      dependenciesFrom: { include: { toTask: { select: { state: true } } } },
      deliverable: { select: { dueDate: true } },
    },
  });

  if (candidates.length === 0) {
    return { kind: "NONE" };
  }

  const blockingCounts = await db.dependency.groupBy({
    by: ["toTaskId"],
    _count: { toTaskId: true },
  });
  const blockingCountByTaskId = new Map(
    blockingCounts.map((row) => [row.toTaskId, row._count.toTaskId])
  );

  const eligible = candidates.filter((task) => {
    const dependencyStates = new Map(
      task.dependenciesFrom.map((dep) => [dep.toTaskId, dep.toTask.state])
    );
    return evaluateEligibility({
      taskState: task.state,
      dependencyStates,
      wipTaskInProgress: false, // already returned above if WIP was spent
    }).eligible;
  });

  if (eligible.length === 0) {
    return { kind: "NONE" };
  }

  const criticalityOf = (task: (typeof eligible)[number]) =>
    blockingCountByTaskId.get(task.id) ?? 0;
  const dueDateOf = (task: (typeof eligible)[number]) =>
    task.deliverable?.dueDate ?? null;

  const ranked = [...eligible].sort((a, b) => {
    const criticalityDiff = criticalityOf(b) - criticalityOf(a);
    if (criticalityDiff !== 0) {
      return criticalityDiff;
    }

    const aDue = dueDateOf(a);
    const bDue = dueDateOf(b);
    if (aDue && bDue) {
      return aDue.getTime() - bDue.getTime();
    }
    if (aDue) {
      return -1;
    }
    if (bDue) {
      return 1;
    }
    return 0;
  });

  const winner = ranked[0];
  const tiedWithWinner = ranked.filter(
    (task) =>
      criticalityOf(task) === criticalityOf(winner) &&
      datesEqual(dueDateOf(task), dueDateOf(winner))
  );

  if (tiedWithWinner.length > 1) {
    return { kind: "TIE", candidates: tiedWithWinner };
  }

  return { kind: "SELECTED", task: winner, reason: "highest-ranked eligible task" };
};

const datesEqual = (a: Date | null, b: Date | null): boolean => {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.getTime() === b.getTime();
};
