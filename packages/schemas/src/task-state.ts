import { z } from "zod";

/**
 * Canonical Task state machine (D9). Single definition point, re-exported
 * to every consumer — web, mobile, agent-runtime, MCP — so no package
 * invents its own copy.
 *
 * Source: skills/copiloto-executar/SKILL.md (Blueprint, read-only) —
 * "BACKLOG_VALIDATED → READY → DOING → VERIFY → DONE", exception
 * `BLOCKED`. PT-BR UI labels (VALIDADO/PRONTO/EM EXECUÇÃO/VERIFICAR/
 * CONCLUÍDO/BLOQUEADO) are presentation only: "Não alterar o estado
 * canônico apenas para traduzir a interface."
 */
export const taskStateSchema = z.enum([
  "BACKLOG_VALIDATED",
  "READY",
  "DOING",
  "VERIFY",
  "DONE",
  "BLOCKED",
]);

export type TaskState = z.infer<typeof taskStateSchema>;

/**
 * Legal forward transitions. `BLOCKED` is reachable from any non-terminal
 * state and, once unblocked, returns to the state it was blocked from —
 * that return path is a domain decision (packages/domain, M02), not
 * encoded here since it depends on why the task was blocked.
 */
export const TASK_STATE_TRANSITIONS: Readonly<Record<TaskState, readonly TaskState[]>> = {
  BACKLOG_VALIDATED: ["READY", "BLOCKED"],
  READY: ["DOING", "BLOCKED"],
  DOING: ["VERIFY", "BLOCKED"],
  VERIFY: ["DONE", "DOING", "BLOCKED"],
  DONE: [],
  BLOCKED: ["BACKLOG_VALIDATED", "READY", "DOING", "VERIFY"],
};

/**
 * PT-BR presentation labels — moved here (from apps/app's
 * task-state-badge.tsx, M05) so packages/agent-runtime (M06) can reuse
 * the exact same map for the Copiloto's fixed-format output instead of
 * defining a second copy. Presentation only, per the same rule cited
 * above: never alter the canonical state value.
 */
export const TASK_STATE_LABEL_PT: Readonly<Record<TaskState, string>> = {
  BACKLOG_VALIDATED: "Validado",
  READY: "Pronto",
  DOING: "Em execução",
  VERIFY: "Verificar",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
};
