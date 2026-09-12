import { rankEligibleTasks } from "@repo/application";
import { forWorkspace } from "@repo/database";

export interface HorizonItem {
  readonly state: string;
  readonly title: string;
}

export interface AgoraProximoDepois {
  readonly agora: HorizonItem | null;
  readonly depois: readonly HorizonItem[];
  readonly proximo: readonly HorizonItem[];
}

/**
 * agora_proximo_depois projection (M07-T04, projections.md). "Agrupe
 * por horizonte... O bloco Agora recebe WIP=1." Agora is the current
 * WIP task if one exists, else the top-ranked eligible task; Próximo is
 * the rest of the eligible ranking; Depois is everything not yet
 * eligible (BACKLOG_VALIDATED with unmet dependencies, or BLOCKED) —
 * real state, not a fabricated bucket.
 */
export const agoraProximoDepois = async (
  workspaceId: string,
  projectId?: string
): Promise<AgoraProximoDepois> => {
  const db = forWorkspace(workspaceId);
  const taskWhere = projectId ? { projectId } : {};

  const [wipTask, ranked, notReadyTasks] = await Promise.all([
    db.task.findFirst({ where: { ...taskWhere, state: "DOING" } }),
    rankEligibleTasks(workspaceId),
    db.task.findMany({
      where: { ...taskWhere, state: { in: ["BACKLOG_VALIDATED", "BLOCKED"] } },
    }),
  ]);

  const rankedInScope = projectId
    ? ranked.filter((r) => r.task.projectId === projectId)
    : ranked;
  const eligibleExcludingWip = rankedInScope.filter(
    (r) => r.task.id !== wipTask?.id
  );

  let agora: HorizonItem | null = null;
  if (wipTask) {
    agora = { title: wipTask.title, state: wipTask.state };
  } else if (eligibleExcludingWip[0]) {
    agora = {
      title: eligibleExcludingWip[0].task.title,
      state: eligibleExcludingWip[0].task.state,
    };
  }

  const proximo = (
    wipTask ? eligibleExcludingWip : eligibleExcludingWip.slice(1)
  ).map((r) => ({
    title: r.task.title,
    state: r.task.state,
  }));

  const depois = notReadyTasks.map((t) => ({ title: t.title, state: t.state }));

  return { agora, proximo, depois };
};
