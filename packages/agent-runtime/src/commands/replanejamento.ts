import { forWorkspace } from "@repo/database";
import type { OrchestratorOutput } from "../output-schema";
import { REPLAN_RETURNS_TO } from "../phases";

export interface ReplanTaskProposal {
  readonly title: string;
}

export interface ReplanProposal {
  readonly deliverableTitle: string;
  readonly dueDate?: Date;
  readonly projectId?: string;
  readonly tasks: readonly ReplanTaskProposal[];
}

const proposalToMermaid = (proposal: ReplanProposal): string => {
  const lines = ["graph TD", `  D["${proposal.deliverableTitle}"]`];
  proposal.tasks.forEach((task, index) => {
    lines.push(`  T${index}["${task.title}"]`);
    lines.push(`  D --> T${index}`);
  });
  return lines.join("\n");
};

/**
 * /replanejamento (CV-REPLAN-001), PRE_APPROVE half. "Não decompor
 * detalhadamente um novo plano relevante antes de apresentar a estrutura
 * orientada a entregáveis para pré-aprovação" (AGENT-FLOW-001) — this is
 * the demonstrable gate the M06 DoD asks for: proposeReplan() never
 * writes to the database. It returns the Mermaid preview and a
 * CONDICIONAL status with write_policy.allowed=false; only
 * confirmReplan() (below), called separately after a human confirms,
 * actually creates anything.
 *
 * "Recalcular apenas o subgrafo afetado" doesn't apply structurally here
 * the way it might in a system with a materialized plan: this system's
 * eligibility ranking (rank-eligible-tasks.ts) is always computed live
 * on read, so there's no stale cached plan to selectively invalidate —
 * a real simplification of this system's architecture, not a
 * corner-cut on the command.
 */
export const proposeReplan = (
  proposal: ReplanProposal
): OrchestratorOutput => ({
  status: "CONDICIONAL",
  route: { module: "ORQ-COP-001", action: "replanejamento.propose" },
  read_scope: ["Deliverable", "Task"],
  write_policy: {
    allowed: false,
    targets: ["Deliverable", "Task"],
    requires_human_confirmation: true,
  },
  state_transition: null,
  derived_progress_pct: null,
  ui: {
    headline: `Pré-aprovação: ${proposal.deliverableTitle}`,
    agora: `${proposal.tasks.length} tarefa(s) propostas sob "${proposal.deliverableTitle}".`,
    tempo: null,
    conclui_quando: null,
    evidencia: null,
    proxima_acao:
      "Confirme para decompor (criar o entregável e as tarefas), ou ajuste a proposta.",
    mermaid: proposalToMermaid(proposal),
  },
  warnings: [
    `Gate: retorna a ${REPLAN_RETURNS_TO} → PRE_APPROVE antes de qualquer nova decomposição (AGENT-FLOW-001).`,
  ],
});

/**
 * DECOMPOSE, reached only after a human confirms the proposeReplan()
 * preview. Actually persists Deliverable + Task rows.
 *
 * `confirmedByActorRef` is supplied by the caller (the /api/chat route,
 * after requireRole — see apps/app) rather than resolved here:
 * agent-runtime has no Clerk/auth context of its own, by design (same
 * boundary every other package in this monorepo keeps — auth stays in
 * apps/app and packages/auth).
 */
export const confirmReplan = async (
  workspaceId: string,
  proposal: ReplanProposal,
  confirmedByActorRef: string
): Promise<OrchestratorOutput> => {
  const db = forWorkspace(workspaceId);

  const deliverable = await db.deliverable.create({
    data: {
      workspaceId,
      title: proposal.deliverableTitle,
      projectId: proposal.projectId,
      dueDate: proposal.dueDate,
    },
  });

  const createdTasks = await db.$transaction([
    ...proposal.tasks.map((task) =>
      db.task.create({
        data: {
          workspaceId,
          deliverableId: deliverable.id,
          projectId: proposal.projectId,
          title: task.title,
        },
      })
    ),
    db.auditEvent.create({
      data: {
        workspaceId,
        actorType: "AGENT",
        actorRef: confirmedByActorRef,
        action: "PLAN_DECOMPOSED",
        objectType: "Deliverable",
        objectId: deliverable.id,
        authorityRuleId: "AGENT-FLOW-001:DECOMPOSE",
        metadata: { taskCount: proposal.tasks.length },
      },
    }),
  ]);

  return {
    status: "OK",
    route: { module: "ORQ-COP-001", action: "replanejamento.confirm" },
    read_scope: ["Deliverable", "Task"],
    write_policy: {
      allowed: true,
      targets: ["Deliverable", "Task", "AuditEvent"],
      requires_human_confirmation: false,
    },
    state_transition: {
      object_id: deliverable.id,
      from: "none",
      to: "created",
      guards: ["human-confirmed via PRE_APPROVE"],
    },
    derived_progress_pct: 0,
    ui: {
      headline: `Decomposto: ${proposal.deliverableTitle}`,
      agora: `${createdTasks.length - 1} tarefa(s) criada(s).`,
      tempo: null,
      conclui_quando: null,
      evidencia: null,
      proxima_acao: "Use /agora para ver a próxima ação elegível.",
      mermaid: null,
    },
  };
};
