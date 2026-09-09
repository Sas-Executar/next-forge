import { nextAction } from "@repo/application";
import { forWorkspace } from "@repo/database";
import { dayRange } from "@repo/domain";
import type { OrchestratorOutput } from "../output-schema";

/**
 * /bomdia (CV-BOMDIA-001). "Validar fechamento anterior, resolver
 * trabalho liberado e emitir o dia" (SKILL.md).
 *
 * This schema has no explicit "day" entity to close/open (no
 * resume_from field, no per-day record) — the honest, real equivalent
 * available today: check whether the current WIP task (if any) has sat
 * in DOING since before today's UTC boundary (a real signal, from
 * Task.updatedAt, that yesterday's work wasn't closed out), then resolve
 * today's work the same way /agora does. Yesterday's evidence count
 * (real Evidence rows) stands in for "validar fechamento anterior" —
 * it's what actually got proven done, not a fabricated day-closure flag.
 */
export const runBomdia = async (
  workspaceId: string
): Promise<OrchestratorOutput> => {
  const db = forWorkspace(workspaceId);
  const today = dayRange(0);
  const yesterday = dayRange(-1);

  const [wipTask, evidenceYesterday, result] = await Promise.all([
    db.task.findFirst({ where: { state: "DOING" } }),
    db.evidence.count({
      where: { createdAt: { gte: yesterday.start, lt: yesterday.end } },
    }),
    nextAction(workspaceId),
  ]);

  const warnings = [
    `Evidências registradas ontem: ${evidenceYesterday}.`,
    'Sem entidade de "dia" no schema — este comando não fecha nem abre um dia formalmente, apenas valida a tarefa em execução e resolve o próximo trabalho liberado.',
  ];
  const staleWip = wipTask && wipTask.updatedAt < today.start;
  if (staleWip) {
    warnings.unshift(
      `"${wipTask.title}" está em EM EXECUÇÃO desde antes de hoje — valide se ainda é o foco certo antes de continuar.`
    );
  }

  if (result.kind === "SELECTED") {
    return {
      status: staleWip ? "CONDICIONAL" : "OK",
      route: { module: "AGENTE-Copiloto-007", action: "bomdia" },
      read_scope: ["Task", "Evidence", "Dependency", "Deliverable"],
      write_policy: {
        allowed: false,
        targets: [],
        requires_human_confirmation: false,
      },
      state_transition: null,
      derived_progress_pct: null,
      ui: {
        headline: "Dia iniciado",
        agora: result.task.title,
        tempo: null,
        conclui_quando: null,
        evidencia: null,
        proxima_acao:
          result.reason === "already in progress (WIP=1)"
            ? "Continue a tarefa em execução."
            : "Leve esta tarefa para EM EXECUÇÃO para começar o dia.",
        mermaid: null,
      },
      warnings,
    };
  }

  return {
    status: "BLOQUEADO",
    route: { module: "AGENTE-Copiloto-007", action: "bomdia" },
    read_scope: ["Task", "Evidence", "Dependency", "Deliverable"],
    write_policy: {
      allowed: false,
      targets: [],
      requires_human_confirmation: false,
    },
    state_transition: null,
    derived_progress_pct: null,
    ui: {
      headline: "Nada liberado para hoje",
      agora:
        result.kind === "TIE"
          ? `Empate entre ${result.candidates.length} tarefas — decisão humana necessária.`
          : "Nenhuma tarefa elegível no momento.",
      tempo: null,
      conclui_quando: null,
      evidencia: null,
      proxima_acao:
        result.kind === "TIE"
          ? "Escolha manualmente qual tarefa iniciar."
          : "Valide itens do backlog ou desbloqueie dependências.",
      mermaid: null,
    },
    warnings,
  };
};
