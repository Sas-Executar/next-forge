import { SCROLL_TASK_TRANSITIONS, type ScrollTaskState } from "@repo/schemas";

/**
 * Fase 7 (APP-SCR-001) — structural-only guard, same pure/no-I/O
 * contract as every other `canTransition*` in this package.
 */
export const canTransitionScrollTask = (
  from: ScrollTaskState,
  to: ScrollTaskState
): boolean => SCROLL_TASK_TRANSITIONS[from].includes(to);

/**
 * "Auto-scroll nunca marca conclusão automaticamente" — a regra em si
 * não pode ser expressa como uma restrição na tabela de transições
 * (estruturalmente, `timer_elapsed → completed` É uma transição legal,
 * porque o usuário PODE concluir depois que o timer estourou). A regra
 * real é sobre QUEM chama a transição, não sobre se ela é legal — este
 * helper existe só para o timer em si nunca chamar `completed`
 * diretamente; um timer que estoura só pode levar a `timer_elapsed`,
 * nunca pular direto para `completed`.
 */
export const onTimerElapsed = (
  from: ScrollTaskState
): ScrollTaskState | null =>
  canTransitionScrollTask(from, "timer_elapsed") ? "timer_elapsed" : null;
