import type { NextActionResult } from "@repo/application";
import { nextAction } from "@repo/application";
import { forWorkspace } from "@repo/database";

export interface MapaOperacional {
  readonly agora: {
    readonly title: string;
    readonly completionCriterion: string | null;
    readonly evidenceRequired: string | null;
  } | null;
  readonly blockers: readonly string[];
  readonly depois: readonly string[];
  readonly evidenceExists: boolean;
  readonly evidenceQuestion: string;
  readonly position: string;
  readonly proximo: readonly string[];
  readonly sustainedProgressPct: number;
}

const positionFor = (
  agoraTask: { readonly title: string } | null,
  result: NextActionResult
): string => {
  if (agoraTask) {
    return `Em execução: ${agoraTask.title}`;
  }
  if (result.kind === "TIE") {
    return "Empate — decisão humana necessária";
  }
  return "Nada em execução";
};

const proximoFor = (result: NextActionResult): readonly string[] => {
  if (result.kind === "TIE") {
    return result.candidates.map((t) => t.title);
  }
  return [];
};

/**
 * mapa_operacional projection (M07-T04, projections.md — the default
 * when no projection is chosen). "Mostre posição, progresso sustentado,
 * ação Agora, critério de conclusão, evidência necessária, bloqueios,
 * itens Próximo/Depois e a pergunta: 'A prova descrita existe?'"
 *
 * `completionCriterion`/`evidenceRequired` stay null for the same
 * disclosed reason as everywhere else in this codebase: no per-task
 * duration/DoD field exists. `evidenceExists` is real, though — it
 * checks whether an Evidence row actually exists for the current
 * action, which is the literal answer to the spec's own question.
 */
export const mapaOperacional = async (
  workspaceId: string,
  projectId?: string
): Promise<MapaOperacional> => {
  const db = forWorkspace(workspaceId);
  const taskWhere = projectId ? { projectId } : {};

  const [result, blockedTasks, grouped, backlogTasks] = await Promise.all([
    nextAction(workspaceId),
    db.task.findMany({ where: { ...taskWhere, state: "BLOCKED" } }),
    db.task.groupBy({
      where: taskWhere,
      by: ["state"],
      _count: { state: true },
    }),
    db.task.findMany({ where: { ...taskWhere, state: "BACKLOG_VALIDATED" } }),
  ]);

  const total = grouped.reduce((sum, g) => sum + g._count.state, 0);
  const done = grouped.find((g) => g.state === "DONE")?._count.state ?? 0;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const agoraTask = result.kind === "SELECTED" ? result.task : null;
  const evidenceExists = agoraTask
    ? (await db.evidence.count({ where: { taskId: agoraTask.id } })) > 0
    : false;

  return {
    position: positionFor(agoraTask, result),
    sustainedProgressPct: percent,
    agora: agoraTask
      ? {
          title: agoraTask.title,
          completionCriterion: null,
          evidenceRequired: null,
        }
      : null,
    blockers: blockedTasks.map((t) => t.title),
    proximo: proximoFor(result),
    depois: backlogTasks.map((t) => t.title),
    evidenceQuestion: "A prova descrita existe?",
    evidenceExists,
  };
};
