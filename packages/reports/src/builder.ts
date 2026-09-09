import { randomUUID } from "node:crypto";
import { nextAction, rankEligibleTasks } from "@repo/application";
import { forWorkspace } from "@repo/database";
import type { StatusReport } from "./status-report-schema";

const RECENT_EVIDENCE_LIMIT = 10;
const NEXT_ITEMS_LIMIT = 3;

/**
 * StatusReport builder (M07-T01, SPEC-ROUTINES-001 §4). Every field is
 * computed from real workspace data — no manual entry, no fabricated
 * advice. Where the spec's shape has no real equivalent in this schema
 * yet, the field stays null/empty and the reason is named in `gaps`
 * rather than silently omitted:
 *
 *  - `run_id`: SPEC-ROUTINES-001's own pipeline (§5) produces a
 *    StatusReport as the output of a RoutineRun — the routine engine
 *    itself is M10, not built yet, so every report built here is
 *    "manual" (`run_id: null`).
 *  - `progress.cycle_current`: no Sprint/C72 cycle concept is persisted
 *    anywhere in this schema (same gap /estado.ts already discloses).
 *  - `now.duration` / `now.completion_criterion`: Task has no
 *    duration or per-task Definition-of-Done field (same gap
 *    agora.ts already discloses for the Copiloto's /agora command).
 */
export const buildStatusReport = async (
  workspaceId: string,
  projectId?: string
): Promise<StatusReport> => {
  const db = forWorkspace(workspaceId);
  const taskWhere = projectId ? { projectId } : {};

  const [
    grouped,
    wipTask,
    lastDone,
    ranked,
    recentEvidence,
    overdueDeliverables,
    nextActionResult,
  ] = await Promise.all([
    db.task.groupBy({
      where: taskWhere,
      by: ["state"],
      _count: { state: true },
    }),
    db.task.findFirst({ where: { ...taskWhere, state: "DOING" } }),
    db.task.findFirst({
      where: { ...taskWhere, state: "DONE" },
      orderBy: { updatedAt: "desc" },
    }),
    rankEligibleTasks(workspaceId),
    db.evidence.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_EVIDENCE_LIMIT,
    }),
    db.deliverable.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        dueDate: { lt: new Date() },
      },
      include: { tasks: { select: { state: true } } },
    }),
    nextAction(workspaceId),
  ]);

  const rankedInScope = projectId
    ? ranked.filter((r) => r.task.projectId === projectId)
    : ranked;
  const blockedCount =
    grouped.find((g) => g.state === "BLOCKED")?._count.state ?? 0;
  const total = grouped.reduce((sum, g) => sum + g._count.state, 0);
  const done = grouped.find((g) => g.state === "DONE")?._count.state ?? 0;
  const projectPercent = total === 0 ? 0 : Math.round((done / total) * 100);

  // A deliverable is genuinely overdue only if it still has undone work —
  // a past-due deliverable whose tasks are all DONE isn't a live risk.
  const liveOverdue = overdueDeliverables.filter((d) =>
    d.tasks.some((t) => t.state !== "DONE")
  );

  const nextItems = rankedInScope
    .filter((r) => r.task.id !== wipTask?.id)
    .slice(0, NEXT_ITEMS_LIMIT)
    .map((r) => r.task.title);

  const blockedTasks = await db.task.findMany({
    where: { ...taskWhere, state: "BLOCKED" },
  });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayDelta = recentEvidence.filter(
    (e) => e.createdAt >= todayStart
  ).length;

  return {
    report_id: randomUUID(),
    run_id: null,
    project_id: projectId ?? null,
    generated_at: new Date().toISOString(),
    status: blockedCount > 0 ? "CONDICIONAL" : "OK",
    progress: {
      project_percent: projectPercent,
      cycle_current: null,
      today_delta: todayDelta,
    },
    triptych: {
      previous: lastDone
        ? { title: lastDone.title, state: lastDone.state }
        : null,
      current: wipTask ? { title: wipTask.title, state: wipTask.state } : null,
      next:
        nextItems.length > 0 ? { title: nextItems[0], state: "READY" } : null,
    },
    now:
      nextActionResult.kind === "SELECTED"
        ? {
            action_id: nextActionResult.task.id,
            title: nextActionResult.task.title,
            duration: null,
            completion_criterion: null,
            evidence_required: "Evidence obrigatória para DONE.",
          }
        : null,
    properties: {
      context: `${total} tarefa(s), ${done} concluída(s).`,
      problem:
        blockedTasks.length > 0
          ? `${blockedTasks.length} bloqueio(s): ${blockedTasks.map((t) => t.title).join(", ")}.`
          : "Nenhum bloqueio identificado.",
      process: "WIP=1 — uma tarefa em execução por vez.",
      progress: `${projectPercent}% (${done}/${total})`,
      next_1: nextItems[0] ?? null,
      next_2: nextItems[1] ?? null,
      next_3: nextItems[2] ?? null,
      risk:
        liveOverdue.length > 0
          ? `${liveOverdue.length} entregável(is) com prazo vencido: ${liveOverdue.map((d) => d.title).join(", ")}.`
          : "Nenhum risco identificado.",
      prevention:
        liveOverdue.length > 0
          ? `Revisar prazo de: ${liveOverdue.map((d) => d.title).join(", ")}.`
          : "Nenhuma ação preventiva necessária.",
      delivery: lastDone
        ? `${lastDone.title} — concluída.`
        : "Nenhuma entrega registrada ainda.",
    },
    evidence_refs: recentEvidence.map((e) => e.id),
    gaps: [
      "run_id: sem motor de RoutineRun ainda (M10) — todo relatório aqui é gerado manualmente.",
      "progress.cycle_current: nenhum conceito de Sprint/C72 persistido neste schema.",
      "now.duration / now.completion_criterion: Task não tem campo de duração nem Definition-of-Done por tarefa.",
    ],
  };
};
