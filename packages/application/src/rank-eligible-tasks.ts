import { forWorkspace } from "@repo/database";
import type { Task } from "@repo/database";
import { evaluateEligibility } from "./eligibility";

export interface RankedTask {
  task: Task;
  criticality: number;
  dueDate: Date | null;
}

/**
 * Shared ranking core behind `nextAction()` (M04-T02, next-action.ts —
 * see that file for the full precedence-tier documentation, not
 * repeated here) and `/sprint`'s execution-window view (M05-T01): both
 * need "eligible tasks in priority order", `nextAction` just takes the
 * top one.
 */
export const rankEligibleTasks = async (
  workspaceId: string
): Promise<RankedTask[]> => {
  const db = forWorkspace(workspaceId);

  const candidates = await db.task.findMany({
    where: { state: "READY" },
    include: {
      dependenciesFrom: { include: { toTask: { select: { state: true } } } },
      deliverable: { select: { dueDate: true } },
    },
  });

  if (candidates.length === 0) {
    return [];
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
      wipTaskInProgress: false,
    }).eligible;
  });

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

  return ranked.map((task) => ({
    task,
    criticality: criticalityOf(task),
    dueDate: dueDateOf(task),
  }));
};

export const datesEqual = (a: Date | null, b: Date | null): boolean => {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.getTime() === b.getTime();
};
