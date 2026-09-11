import { z } from "zod";

/**
 * Fase 7 (APP-SCR-001) — Scroll Task. Fonte: plano §7 Fase 7 ("Tela
 * 33/33/33, unidade ativa no centro, escopo action|task|phase|workflow,
 * timer 15/30/45, duplo toque expande. Estados idle|running|expanded|
 * completed|deferred|timer_elapsed") — conteúdo original desta
 * implementação, sem corpus adicional acessível além dessa frase do
 * plano (mesma limitação de proveniência já registrada nas Fases 5/6).
 */
export const scrollTaskScopeSchema = z.enum([
  "action",
  "task",
  "phase",
  "workflow",
]);
export type ScrollTaskScope = z.infer<typeof scrollTaskScopeSchema>;

export const scrollTaskStateSchema = z.enum([
  "idle",
  "running",
  "expanded",
  "completed",
  "deferred",
  "timer_elapsed",
]);
export type ScrollTaskState = z.infer<typeof scrollTaskStateSchema>;

/**
 * "Timer 15/30/45" — os únicos 3 valores válidos (minutos). Fora de
 * escopo v1, per plano: timer adaptativo por IA — este enum fechado é
 * exatamente o que impede um valor "adaptativo" de entrar por acidente.
 */
export const scrollTaskTimerMinutesSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(45),
]);
export type ScrollTaskTimerMinutes = z.infer<
  typeof scrollTaskTimerMinutesSchema
>;

/**
 * Uma unidade exibida no Scroll Task — a `refId` aponta para o objeto
 * real (Task.id, Action.id, etc., dependendo de `scope`); este contrato
 * não duplica o domínio de Task, só referencia.
 */
export const scrollTaskUnitSchema = z.object({
  refId: z.string().min(1),
  scope: scrollTaskScopeSchema,
  titulo: z.string().min(1),
});
export type ScrollTaskUnit = z.infer<typeof scrollTaskUnitSchema>;

/**
 * Transições legais entre os 6 estados. A regra mais importante desta
 * tabela, testada explicitamente
 * (packages/domain/__tests__/scroll-task-state.test.ts): `timer_elapsed`
 * NUNCA aparece como origem de uma transição para `completed` sem
 * passar por uma ação explícita do usuário — e mesmo assim, a
 * transição em si não distingue "manual" de "automático" (isso é
 * responsabilidade do chamador: nenhum código deste pacote chama
 * `canTransitionScrollTask(..., "completed")` a partir de um timer).
 * "Auto-scroll nunca marca conclusão automaticamente" (aceite do plano)
 * é garantido pela ausência de qualquer caller automático, não por uma
 * proibição estrutural nesta tabela — a tabela sozinha permite a
 * transição porque ela É válida quando o USUÁRIO a aciona depois do
 * timer estourar.
 */
export const SCROLL_TASK_TRANSITIONS: Readonly<
  Record<ScrollTaskState, readonly ScrollTaskState[]>
> = {
  idle: ["running"],
  running: ["expanded", "completed", "deferred", "timer_elapsed"],
  expanded: ["running", "completed", "deferred"],
  timer_elapsed: ["running", "completed", "deferred"],
  completed: [],
  deferred: [],
};
