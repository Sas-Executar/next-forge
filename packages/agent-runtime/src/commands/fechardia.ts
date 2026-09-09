import { forWorkspace } from "@repo/database";
import { canTransitionTask } from "@repo/domain";
import type { OrchestratorOutput } from "../output-schema";

/**
 * /fechardia (CV-FECHAR-001). "Validar resultado, evidência, estado,
 * registrar progresso/resume_from e fechar o dia" (SKILL.md).
 *
 * Same schema gap as /bomdia — no "day"/"resume_from" entity exists —
 * so this command operates on the real equivalent: the current WIP task.
 * It NEVER performs the transition itself. The Copiloto is an AGENT
 * actor (packages/schemas ActorType), and canTransitionTask's
 * AuthorityGate (packages/domain, SPEC-ROUTINES-001 §7) only
 * auto-allows AGENT to promote BACKLOG_VALIDATED→READY — DOING, VERIFY,
 * and DONE are HUMAN_REQUIRED regardless of what this command decides.
 * So the only thing it can honestly do is report exactly what's missing
 * and what gate applies; the actual write goes through the same
 * completeAction server action /now's UI already uses (actor="USER"),
 * once a human confirms.
 */
export const runFechardia = async (
  workspaceId: string
): Promise<OrchestratorOutput> => {
  const db = forWorkspace(workspaceId);
  const wipTask = await db.task.findFirst({ where: { state: "DOING" } });

  const base = {
    route: { module: "AGENTE-Copiloto-007" as const, action: "fechardia" },
    read_scope: ["Task", "Evidence"],
    derived_progress_pct: null,
  };

  if (!wipTask) {
    const verifyTask = await db.task.findFirst({
      where: { state: "VERIFY" },
    });

    if (!verifyTask) {
      return {
        ...base,
        status: "BLOQUEADO",
        write_policy: {
          allowed: false,
          targets: [],
          requires_human_confirmation: false,
        },
        state_transition: null,
        ui: {
          headline: "Nada para fechar",
          agora: "Nenhuma tarefa em execução ou em verificação.",
          tempo: null,
          conclui_quando: null,
          evidencia: null,
          proxima_acao: "Use /agora para iniciar a próxima tarefa liberada.",
          mermaid: null,
        },
      };
    }

    const evidenceCount = await db.evidence.count({
      where: { taskId: verifyTask.id },
    });
    const decision = canTransitionTask(verifyTask.state, "DONE", "AGENT");

    return {
      ...base,
      status: evidenceCount > 0 ? "CONDICIONAL" : "BLOQUEADO",
      write_policy: {
        allowed: false,
        targets: ["Task", "Evidence"],
        requires_human_confirmation: true,
      },
      state_transition: {
        object_id: verifyTask.id,
        from: verifyTask.state,
        to: "DONE",
        guards: [`AuthorityGate: ${decision}`, "requires Evidence row"],
      },
      ui: {
        headline:
          evidenceCount > 0 ? "Pronta para concluir" : "Falta evidência",
        agora: verifyTask.title,
        tempo: null,
        conclui_quando: "Evidência registrada e confirmação humana.",
        evidencia:
          evidenceCount > 0
            ? `${evidenceCount} evidência(s) já registrada(s).`
            : "Nenhuma evidência registrada ainda — obrigatória para DONE.",
        proxima_acao:
          evidenceCount > 0
            ? "Confirme a conclusão (exige ação humana — o Copiloto não pode concluir sozinho)."
            : "Registre uma evidência antes de concluir.",
        mermaid: null,
      },
    };
  }

  const decision = canTransitionTask(wipTask.state, "VERIFY", "AGENT");

  return {
    ...base,
    status: "CONDICIONAL",
    write_policy: {
      allowed: false,
      targets: ["Task"],
      requires_human_confirmation: true,
    },
    state_transition: {
      object_id: wipTask.id,
      from: wipTask.state,
      to: "VERIFY",
      guards: [`AuthorityGate: ${decision}`],
    },
    ui: {
      headline: "Ainda em execução",
      agora: wipTask.title,
      tempo: null,
      conclui_quando: "Levar para VERIFICAR e depois registrar evidência.",
      evidencia: null,
      proxima_acao:
        "Confirme a transição para VERIFICAR quando o trabalho estiver pronto (exige ação humana).",
      mermaid: null,
    },
  };
};
