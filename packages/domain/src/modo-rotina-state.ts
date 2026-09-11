import {
  ROTINA_NORMATIVA_TRANSITIONS,
  type RotinaNormativaStatus,
} from "@repo/schemas";

/**
 * Structural-only guard for the Modo Rotina machine (Fase 4) — same
 * pure/no-I/O contract as canTransitionRoutineStatus (routine-state.ts).
 * Unlike canTransitionTask, no actor-gating dimension here either: per
 * the plan, "nenhuma rotina ativa sem confirmação" is an AUTHORITY rule
 * enforced by the hook layer (apps/copiloto-runtime/src/hooks.ts) and
 * the human-confirmation gate, not a parameter of this transition table
 * — PROPOSTO → CONFIRMADO is only reachable after that confirmation
 * already happened, by construction of the caller, mirroring how
 * proposeReplan()/confirmReplan() (packages/agent-runtime) split the
 * write itself into two calls instead of gating one call by actor.
 */
export const canTransitionRotinaNormativa = (
  from: RotinaNormativaStatus,
  to: RotinaNormativaStatus
): boolean => ROTINA_NORMATIVA_TRANSITIONS[from].includes(to);
