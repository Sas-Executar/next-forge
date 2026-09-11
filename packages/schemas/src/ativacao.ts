import { z } from "zod";
import { actorTypeSchema } from "./actor";

/**
 * Camada 1 — Ativação (uma vez por tenant), a "Visão Sistêmica Normativa"
 * declarada pelo usuário como decisão funcional confirmada (plano §5.1):
 * Onboarding → Scanner → Productivity → Operations → Modo Rotina →
 * 1º Entregável. Conciliada com AGENT-FLOW-001 (Camada 2, já implementada
 * em packages/agent-runtime/src/phases.ts) por
 * docs/executar/ADRS_CANDIDATOS/ADR-003-agent-flow-visao-normativa.md.
 *
 * Diferente dos demais arquivos deste pacote, este NÃO cita uma fonte do
 * Executar-app-Blueprint — esse corpus não está acessível nesta sessão
 * (ver docs/executar/DIAGNOSTICO_REPOSITORIO.md §0). É conteúdo novo,
 * autorado na Fase 1 do plano aprovado, a partir só do que o usuário já
 * confirmou e do que packages/agent-runtime já implementa.
 */
export const faseAtivacaoSchema = z.enum([
  "ONBOARDING",
  "SCANNER",
  "PRODUCTIVITY",
  "OPERATIONS",
  "MODO_ROTINA",
  "PRIMEIRO_ENTREGAVEL",
  "CONCLUIDA",
]);
export type FaseAtivacao = z.infer<typeof faseAtivacaoSchema>;

/**
 * Sequência linear e obrigatória, sem bifurcação: a Camada 1 roda uma
 * única vez por tenant. "Productivity obrigatoriamente antes de
 * Operations" é regra confirmada pelo usuário, não uma escolha desta
 * implementação — por isso a tabela não tem ramos alternativos, ao
 * contrário de TASK_STATE_TRANSITIONS (task-state.ts), que tem BLOCKED
 * como válvula de escape. Uma falha durante uma fase da Camada 1 é
 * modelada fora desta máquina (o HandoffEnvelope que falhou a validação
 * simplesmente não avança a fase), não como um estado "BLOCKED" aqui.
 */
export const FASE_ATIVACAO_TRANSITIONS: Readonly<
  Record<FaseAtivacao, readonly FaseAtivacao[]>
> = {
  ONBOARDING: ["SCANNER"],
  SCANNER: ["PRODUCTIVITY"],
  PRODUCTIVITY: ["OPERATIONS"],
  OPERATIONS: ["MODO_ROTINA"],
  MODO_ROTINA: ["PRIMEIRO_ENTREGAVEL"],
  PRIMEIRO_ENTREGAVEL: ["CONCLUIDA"],
  CONCLUIDA: [],
};

/**
 * Contrato de handoff entre etapas da Camada 1 (e, no fim, para a
 * Camada 2 via REPORT — ver ADR-003). `payload` fica como um record
 * aberto porque cada fase produz uma forma diferente (PerfilOperacional,
 * lista de FonteAutorizada, ModeloOperacional, ...) — validar o formato
 * específico de cada payload é responsabilidade do orquestrador da
 * Fase 5, não deste envelope genérico.
 */
export const handoffEnvelopeSchema = z
  .object({
    faseOrigem: faseAtivacaoSchema,
    faseDestino: faseAtivacaoSchema,
    workspaceId: z.string().min(1),
    producedAt: z.string().datetime(),
    producedBy: actorTypeSchema,
    payload: z.record(z.string(), z.unknown()),
  })
  .refine(
    (envelope) =>
      FASE_ATIVACAO_TRANSITIONS[envelope.faseOrigem].includes(
        envelope.faseDestino
      ),
    {
      message:
        "faseDestino não é uma transição legal de faseOrigem, conforme FASE_ATIVACAO_TRANSITIONS",
    }
  );
export type HandoffEnvelope = z.infer<typeof handoffEnvelopeSchema>;

/**
 * Identificador de provedor de fonte externa. Mantido deliberadamente
 * em lockstep manual com o enum Prisma `IntegrationProvider`
 * (packages/database/prisma/schema.prisma) — mesmo padrão que
 * actor.ts usa para ActorType. packages/schemas não depende de
 * @repo/database (é um pacote de contratos puro, zero deps de
 * workspace), então esta cópia é intencional, não um esquecimento.
 */
export const fonteAutorizadaProviderSchema = z.enum([
  "WHATSAPP",
  "GMAIL",
  "OUTLOOK",
  "GOOGLE_CALENDAR",
  "OUTLOOK_CALENDAR",
]);
export type FonteAutorizadaProvider = z.infer<
  typeof fonteAutorizadaProviderSchema
>;

/**
 * Saída da fase ONBOARDING: identidade, objetivos, restrições e IDs
 * verbais do tenant, mais as fontes cuja autorização foi solicitada
 * (a concessão em si é `FonteAutorizada`, abaixo — pedir e conceder são
 * dois momentos distintos). "Solicitar autorizações" sem acesso a dados
 * externos é o limite do agente `executar-onboarding` (plano §6.5).
 */
export const perfilOperacionalSchema = z.object({
  workspaceId: z.string().min(1),
  nomeExibicao: z.string().min(1),
  objetivos: z.array(z.string().min(1)).min(1),
  restricoes: z.array(z.string().min(1)).default([]),
  idsVerbais: z.record(z.string(), z.string().min(1)).default({}),
  autorizacoesSolicitadas: z.array(fonteAutorizadaProviderSchema).default([]),
  concluidoEm: z.string().datetime().optional(),
});
export type PerfilOperacional = z.infer<typeof perfilOperacionalSchema>;

/**
 * Saída da fase SCANNER: consentimento concedido (não apenas solicitado)
 * para uma fonte externa somente-leitura, com proveniência — o mesmo
 * princípio que `IntegrationConnection`/`ExternalObjectRef` já aplicam
 * no schema Prisma (D4, ADR-002). `escopoLeitura` é a lista de
 * permissões concedidas (ex.: "gmail.readonly"), nunca um escopo de
 * escrita — o Scanner "não decide automaticamente" (plano §5.1).
 */
export const fonteAutorizadaSchema = z.object({
  provider: fonteAutorizadaProviderSchema,
  workspaceId: z.string().min(1),
  autorizadoEm: z.string().datetime(),
  autorizadoPor: actorTypeSchema,
  escopoLeitura: z.array(z.string().min(1)).min(1),
  revogadoEm: z.string().datetime().nullable().default(null),
});
export type FonteAutorizada = z.infer<typeof fonteAutorizadaSchema>;

/**
 * Saída da fase OPERATIONS: cadência, responsáveis, canais e indicadores
 * do modelo operacional do tenant — insumo direto do Modo Rotina
 * seguinte. `fusoHorario` tem default `America/Sao_Paulo` só como valor
 * de exemplo do plano; D10 (política de fuso/retry/notificações) segue
 * `DECISAO_REQUERIDA` — este default não fecha D10, só evita um campo
 * obrigatório sem exemplo em testes/consumidores desta Fase 1.
 * `rotinasPropostas` é limitado a 3 (plano §5.1: "exatamente 3
 * automações sugeridas"), mas a validação de cardinalidade EXATA (não
 * apenas máxima) e o conteúdo de cada proposta — benefício, dados
 * necessários, consentimento, risco, reversibilidade — são
 * responsabilidade do Modo Rotina real (Fase 4), não deste schema.
 */
export const modeloOperacionalSchema = z.object({
  workspaceId: z.string().min(1),
  cadencia: z.enum(["DIARIA", "SEMANAL", "QUINZENAL", "MENSAL"]),
  responsaveis: z.array(z.string().min(1)).min(1),
  canais: z.array(z.string().min(1)).min(1),
  indicadores: z.array(z.string().min(1)).default([]),
  fusoHorario: z.string().min(1).default("America/Sao_Paulo"),
  rotinasPropostas: z.array(z.string().min(1)).max(3),
});
export type ModeloOperacional = z.infer<typeof modeloOperacionalSchema>;
