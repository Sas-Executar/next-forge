import { z } from "zod";
import { fonteAutorizadaProviderSchema } from "./ativacao";

/**
 * Modo Rotina (D10 — política de fuso/retry/notificações segue
 * DECISAO_REQUERIDA; isto cobre só a forma da máquina e da proposta,
 * não fecha D10). Fonte: nome e semântica declarados pelo usuário
 * (plano §5.1: "máquina Proposto → Confirmado → Ativo ⇄ Pausado,
 * Ativo → Revisão → Ativo") — "Modo Rotina" tem ZERO ocorrências no
 * corpus Blueprint (plano §5.4, confirmado na Fase 0), então esta
 * máquina é conteúdo novo desta implementação, não uma tradução.
 *
 * Deliberadamente um enum e uma tabela DIFERENTES de `RoutineStatus`
 * (routine.ts: DRAFT/ENABLED/PAUSED/DISABLED) — aquela é a máquina já
 * implementada e testada da Camada 2 (packages/routines), com sua
 * própria semântica de config lifecycle. `RotinaNormativaStatus` é a
 * máquina da fase MODO_ROTINA da Camada 1 (ativacao.ts): a proposta e
 * confirmação inicial de até 3 automações, antes de qualquer rotina
 * real existir em `Routine`. O mapa entre as duas — quando/se uma
 * `RotinaProposta` confirmada vira um `Routine` real — é decisão de
 * implementação da Fase 5 (orquestrador), não fechada aqui.
 */
export const rotinaNormativaStatusSchema = z.enum([
  "PROPOSTO",
  "CONFIRMADO",
  "ATIVO",
  "PAUSADO",
  "REVISAO",
]);
export type RotinaNormativaStatus = z.infer<typeof rotinaNormativaStatusSchema>;

export const ROTINA_NORMATIVA_TRANSITIONS: Readonly<
  Record<RotinaNormativaStatus, readonly RotinaNormativaStatus[]>
> = {
  PROPOSTO: ["CONFIRMADO"],
  CONFIRMADO: ["ATIVO"],
  ATIVO: ["PAUSADO", "REVISAO"],
  PAUSADO: ["ATIVO"],
  REVISAO: ["ATIVO"],
};

/**
 * "10 campos obrigatórios por rotina" (plano §5.1) — a lista exata dos
 * 10 campos não existe em nenhuma fonte acessível a esta sessão (mesma
 * lacuna do nome "Modo Rotina" em si). Os 10 campos abaixo são uma
 * proposta autorada nesta Fase 4, derivada do que o restante do corpus
 * já exige de qualquer automação (Regra de Não Decisão #8: benefício,
 * dados necessários, consentimento, risco, reversibilidade) mais os
 * campos operacionais mínimos (identidade, cadência, responsável,
 * canal, fuso). Marcar como `DECISAO_REQUERIDA` se o usuário já tiver
 * uma lista diferente em mente — este schema não fecha D10.
 */
export const rotinaPropostaSchema = z.object({
  // 1
  titulo: z.string().min(1),
  // 2 — o "benefício" da Regra de Não Decisão #8
  descricaoBeneficio: z.string().min(1),
  // 3
  cadencia: z.enum(["DIARIA", "SEMANAL", "QUINZENAL", "MENSAL"]),
  // 4 — "dados necessários"
  dadosNecessarios: z.array(z.string().min(1)).min(1),
  // 5 — "consentimento": quais fontes autorizadas esta rotina consome
  fontesConsultadas: z.array(fonteAutorizadaProviderSchema).default([]),
  // 6 — "risco"
  classificacaoRisco: z.enum(["BAIXO", "MEDIO", "ALTO"]),
  // 7 — "reversibilidade"
  reversivel: z.boolean(),
  descricaoReversibilidade: z.string().min(1),
  // 8
  responsavelRef: z.string().min(1),
  // 9
  canalEntrega: z.string().min(1),
  // 10
  fusoHorario: z.string().min(1).default("America/Sao_Paulo"),
});
export type RotinaProposta = z.infer<typeof rotinaPropostaSchema>;

/**
 * "Exatamente 3 automações sugeridas" (plano §5.1) — cardinalidade
 * EXATA, não máxima (ao contrário de `ModeloOperacional.rotinasPropostas`
 * em ativacao.ts, que só limita a 3 como forma solta de string[]). Este
 * schema é o que a fase MODO_ROTINA da Camada 1 deveria validar antes
 * de avançar para PRIMEIRO_ENTREGAVEL.
 */
export const rotinasPropostasLoteSchema = z
  .array(rotinaPropostaSchema)
  .length(3);
