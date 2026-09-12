import { rankEligibleTasks } from "@repo/application";
import { forWorkspace } from "@repo/database";
import type { TaskState } from "@repo/schemas";
import { TASK_STATE_LABEL_PT } from "@repo/schemas";
import type { OrchestratorOutput } from "../output-schema";

const SPRINT_WINDOW_SIZE = 5;

/**
 * /estado (CV-ESTADO-001). "Mostrar progresso derivado, sprint/C72, gate,
 * bloqueios e posição atual" (SKILL.md) — read-only aggregate over real
 * Task rows, same derivation rule /overview (M05) uses: percentages are
 * computed from canonical objects on every read, never stored.
 *
 * "Gate" isn't reported here: this system has no persisted "plan awaiting
 * approval" state to show — /replanejamento's PRE_APPROVE gate is
 * evaluated fresh on each call, nothing is stored mid-gate. Disclosed via
 * `warnings` rather than fabricating a gate status.
 */
export const runEstado = async (
  workspaceId: string
): Promise<OrchestratorOutput> => {
  const db = forWorkspace(workspaceId);

  const [grouped, wipTask, blockedTasks, ranked] = await Promise.all([
    db.task.groupBy({ by: ["state"], _count: { state: true } }),
    db.task.findFirst({ where: { state: "DOING" } }),
    db.task.findMany({ where: { state: "BLOCKED" } }),
    rankEligibleTasks(workspaceId),
  ]);

  const counts = Object.fromEntries(
    grouped.map((g) => [g.state, g._count.state])
  ) as Partial<Record<TaskState, number>>;
  const total = grouped.reduce((sum, g) => sum + g._count.state, 0);
  const done = counts.DONE ?? 0;
  const progressPct = total === 0 ? 0 : Math.round((done / total) * 100);

  const sprintWindow = ranked.slice(0, SPRINT_WINDOW_SIZE);
  const summary = (Object.keys(TASK_STATE_LABEL_PT) as TaskState[])
    .map((state) => `${TASK_STATE_LABEL_PT[state]}: ${counts[state] ?? 0}`)
    .join(" · ");

  return {
    status: blockedTasks.length > 0 ? "CONDICIONAL" : "OK",
    route: { module: "AGENTE-Copiloto-007", action: "estado" },
    read_scope: ["Task", "Dependency", "Deliverable"],
    write_policy: {
      allowed: false,
      targets: [],
      requires_human_confirmation: false,
    },
    state_transition: null,
    derived_progress_pct: progressPct,
    ui: {
      headline: `${progressPct}% concluído (${done}/${total})`,
      agora: wipTask
        ? `Em execução: ${wipTask.title}`
        : "Nada em execução no momento.",
      tempo: null,
      conclui_quando: null,
      evidencia: null,
      proxima_acao:
        sprintWindow.length > 0
          ? `Fila (${sprintWindow.length}): ${sprintWindow.map((r) => r.task.title).join(", ")}`
          : "Nada elegível na fila agora.",
      mermaid: null,
    },
    warnings: [
      summary,
      ...(blockedTasks.length > 0
        ? [
            `${blockedTasks.length} tarefa(s) bloqueada(s): ${blockedTasks.map((t) => t.title).join(", ")}`,
          ]
        : []),
      "Gate não reportado: nenhum plano fica pendente de aprovação de forma persistida — o gate de /replanejamento é avaliado a cada chamada, não armazenado.",
    ],
  };
};
