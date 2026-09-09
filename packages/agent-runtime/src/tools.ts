import { tool } from "ai";
import { z } from "zod";
import { runPrimaryCommand } from "./commands";
import {
  confirmReplan,
  proposeReplan,
  type ReplanProposal,
} from "./commands/replanejamento";

const replanTaskSchema = z.object({ title: z.string().min(1) });

/**
 * Tool set for the free-form /api/chat route (M06-T04) — the general
 * Q&A path, distinct from the 5 fixed slash commands (which never call
 * the model; see commands/index.ts and the route's own interception).
 * Every tool here is a real read (or, for confirmReplanejamento, a real
 * write gated the same way the UI gates it) against the workspace-scoped
 * Prisma client — no tool fabricates data the domain model doesn't have.
 *
 * `workspaceId` and `confirmedByActorRef` are closed over per-request by
 * the caller (the route, after requireWorkspace()/requireRole()) — this
 * function has no auth context of its own, same boundary as every
 * command module.
 */
export const buildCopilotTools = (
  workspaceId: string,
  confirmedByActorRef: string
) => ({
  bomdia: tool({
    description:
      "Comando /bomdia: valida a tarefa em execução anterior e resolve o trabalho liberado para hoje.",
    inputSchema: z.object({}),
    execute: () => runPrimaryCommand("bomdia", workspaceId),
  }),
  agora: tool({
    description:
      "Comando /agora: mostra somente o objeto atual (WIP=1) e a próxima ação.",
    inputSchema: z.object({}),
    execute: () => runPrimaryCommand("agora", workspaceId),
  }),
  estado: tool({
    description:
      "Comando /estado: progresso derivado, fila de execução e bloqueios.",
    inputSchema: z.object({}),
    execute: () => runPrimaryCommand("estado", workspaceId),
  }),
  fechardia: tool({
    description:
      "Comando /fechardia: valida evidência e reporta o gate de autoridade para fechar a tarefa atual — nunca conclui sozinho.",
    inputSchema: z.object({}),
    execute: () => runPrimaryCommand("fechardia", workspaceId),
  }),
  proporReplanejamento: tool({
    description:
      "Propõe um novo entregável com tarefas (PRE_APPROVE) — NÃO cria nada ainda, apenas mostra a estrutura para aprovação humana.",
    inputSchema: z.object({
      deliverableTitle: z.string().min(1),
      projectId: z.string().optional(),
      tasks: z.array(replanTaskSchema).min(1),
    }),
    execute: (input) =>
      proposeReplan(input satisfies Omit<ReplanProposal, "dueDate">),
  }),
  confirmarReplanejamento: tool({
    description:
      "Confirma e decompõe um plano previamente proposto — só use depois que o humano confirmar explicitamente.",
    inputSchema: z.object({
      deliverableTitle: z.string().min(1),
      projectId: z.string().optional(),
      tasks: z.array(replanTaskSchema).min(1),
    }),
    execute: (input) => confirmReplan(workspaceId, input, confirmedByActorRef),
  }),
});
