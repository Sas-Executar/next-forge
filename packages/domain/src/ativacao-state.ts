import { FASE_ATIVACAO_TRANSITIONS, type FaseAtivacao } from "@repo/schemas";

/**
 * Structural-only guard for the Camada 1 (Ativação) sequence — mesmo
 * contrato pure/no-I/O de canTransitionRoutineStatus (routine-state.ts).
 * Diferente de canTransitionTask, não há gating por actor aqui: a
 * sequência de ativação é sempre conduzida pelo próprio orquestrador
 * determinístico (Fase 5), nunca promovida diretamente por um humano ou
 * por um agente fora dessa orquestração — então não existe uma dimensão
 * "actor" para checar nesta máquina.
 */
export const canTransitionFaseAtivacao = (
  from: FaseAtivacao,
  to: FaseAtivacao
): boolean => FASE_ATIVACAO_TRANSITIONS[from].includes(to);

/** CONCLUIDA é o único estado terminal desta sequência. */
export const isFaseAtivacaoConcluida = (fase: FaseAtivacao): boolean =>
  fase === "CONCLUIDA";
