import { nextAction } from "@repo/application";
import type { OrchestratorOutput } from "../output-schema";

/**
 * /agora (CV-AGORA-001, references/commands.md). "Mostrar somente o
 * objeto atual, DoD, evidência esperada e próxima ação" (SKILL.md) —
 * wraps the same nextAction() WIP=1 selection /now (M04) renders, so the
 * Copiloto and the web UI can never disagree about what "now" means.
 *
 * `tempo` and `conclui_quando` stay null: Task has no duration or
 * per-task Definition-of-Done field in this schema (nextAction.ts notes
 * the same gap for "value priority" — this is the same kind of honestly
 * unimplemented signal, not a fabricated placeholder), disclosed via
 * `warnings` rather than left silently empty.
 */
export const runAgora = async (
  workspaceId: string
): Promise<OrchestratorOutput> => {
  const result = await nextAction(workspaceId);

  const base = {
    route: { module: "AGENTE-Copiloto-007" as const, action: "agora" },
    read_scope: ["Task", "Dependency", "Deliverable"],
    write_policy: {
      allowed: false,
      targets: [],
      requires_human_confirmation: false,
    },
    state_transition: null,
    derived_progress_pct: null,
    warnings: [
      "TEMPO e CONCLUI QUANDO ficam vazios: Task não tem campo de duração nem Definition-of-Done por tarefa neste schema.",
    ],
  };

  if (result.kind === "SELECTED") {
    return {
      ...base,
      status: "OK",
      ui: {
        headline:
          result.reason === "already in progress (WIP=1)"
            ? "Em execução"
            : "Próxima ação elegível",
        agora: result.task.title,
        tempo: null,
        conclui_quando: null,
        evidencia: null,
        proxima_acao:
          result.reason === "already in progress (WIP=1)"
            ? "Finalize a tarefa em execução antes de iniciar outra (WIP=1)."
            : "Leve esta tarefa para EM EXECUÇÃO quando estiver pronto para começar.",
        mermaid: null,
      },
    };
  }

  if (result.kind === "TIE") {
    return {
      ...base,
      status: "CONDICIONAL",
      write_policy: {
        allowed: false,
        targets: [],
        requires_human_confirmation: true,
      },
      ui: {
        headline: "Empate — decisão humana necessária",
        agora: `${result.candidates.length} tarefas empatadas em critério e prazo: ${result.candidates.map((t) => t.title).join(", ")}`,
        tempo: null,
        conclui_quando: null,
        evidencia: null,
        proxima_acao: "Escolha manualmente qual tarefa iniciar.",
        mermaid: null,
      },
    };
  }

  return {
    ...base,
    status: "BLOQUEADO",
    ui: {
      headline: "Nada elegível agora",
      agora: "Nenhuma tarefa pronta para execução no momento.",
      tempo: null,
      conclui_quando: null,
      evidencia: null,
      proxima_acao:
        "Valide itens do backlog ou desbloqueie dependências para liberar trabalho.",
      mermaid: null,
    },
  };
};
