import { rankEligibleTasks } from "@repo/application";
import type { Metadata } from "next";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { ScrollTaskView } from "./scroll-task-view";

export const metadata: Metadata = {
  title: "Scroll Task",
  description:
    "Unidade ativa no centro, avançar uma de cada vez — WIP=1 (APP-SCR-001).",
};

/**
 * Fase 7 (APP-SCR-001) — server component: busca as tarefas elegíveis
 * reais (mesma fonte que /now e /sprint já usam,
 * `rankEligibleTasks`/`packages/application`) e as entrega como
 * `ScrollTaskUnit[]` (`@repo/schemas`) para o componente cliente, que é
 * onde a interação (toque único, duplo toque, timer) de fato acontece.
 */
const ScrollPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;

  const ranked = await rankEligibleTasks(workspace.id);
  const units = ranked.map(({ task }) => ({
    refId: task.id,
    scope: "task" as const,
    titulo: task.title,
  }));

  return <ScrollTaskView units={units} />;
};

export default ScrollPage;
