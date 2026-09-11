import {
  backlogInicialSchema,
  type FaseAtivacao,
  fonteAutorizadaSchema,
  type HandoffEnvelope,
  modeloOperacionalSchema,
  perfilOperacionalSchema,
  primeiroEntregavelSchema,
  rotinasPropostasLoteSchema,
} from "@repo/schemas";
import { z } from "zod";
import { canTransitionFaseAtivacao } from "./ativacao-state";

/**
 * Fase 5 (D2/ADR-004, plano §6.2) — "a Camada 1 é sequência fixa ⇒
 * orquestração determinística em código, com o Agent SDK atuando
 * dentro de cada etapa." Este módulo É essa orquestração: puro,
 * sem I/O, sem chamar `query()` — só decide se um handoff pode avançar.
 * apps/copiloto-runtime (Fase 3) é quem de fato chama o Agent SDK
 * dentro de cada etapa e entrega o resultado aqui para validação.
 *
 * O schema de payload de cada fase é o que essa fase JÁ PRODUZIU ao
 * ser deixada (`faseOrigem` do envelope) — não o que a próxima fase
 * vai consumir. CONCLUIDA não tem schema próprio: é terminal, sem
 * payload de saída.
 */
const FASE_PAYLOAD_SCHEMAS: Partial<Record<FaseAtivacao, z.ZodTypeAny>> = {
  ONBOARDING: perfilOperacionalSchema,
  SCANNER: z.array(fonteAutorizadaSchema),
  PRODUCTIVITY: backlogInicialSchema,
  OPERATIONS: modeloOperacionalSchema,
  MODO_ROTINA: rotinasPropostasLoteSchema,
  PRIMEIRO_ENTREGAVEL: primeiroEntregavelSchema,
};

export type AdvanceFaseAtivacaoResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * A única porta de entrada para avançar a Camada 1. Rejeita em duas
 * camadas independentes:
 *   1. Transição estrutural ilegal (`canTransitionFaseAtivacao`) — já
 *      redundante com o `.refine()` de `handoffEnvelopeSchema`, mas
 *      checado de novo aqui porque um caller pode ter construído o
 *      envelope à mão sem passar pelo parse do schema.
 *   2. Payload da fase de ORIGEM inválido contra o schema daquela fase
 *      — é isso que implementa o aceite "Operations não inicia sem
 *      saída válida de Productivity": um handoff PRODUCTIVITY→OPERATIONS
 *      cujo `payload` não é um `BacklogInicial` válido é rejeitado
 *      aqui, antes de OPERATIONS começar.
 */
export const advanceFaseAtivacao = (
  envelope: HandoffEnvelope
): AdvanceFaseAtivacaoResult => {
  if (!canTransitionFaseAtivacao(envelope.faseOrigem, envelope.faseDestino)) {
    return {
      ok: false,
      reason: `${envelope.faseOrigem} → ${envelope.faseDestino} não é uma transição legal.`,
    };
  }

  const schema = FASE_PAYLOAD_SCHEMAS[envelope.faseOrigem];
  if (schema) {
    const result = schema.safeParse(envelope.payload);
    if (!result.success) {
      return {
        ok: false,
        reason: `payload de ${envelope.faseOrigem} inválido: ${result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")}`,
      };
    }
  }

  return { ok: true };
};
