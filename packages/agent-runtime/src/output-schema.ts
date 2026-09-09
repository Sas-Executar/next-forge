import { z } from "zod";

/**
 * Zod mirror of skills/copiloto-executar/references/contracts/
 * orchestrator-output.schema.json (Blueprint, read-only, JSON Schema
 * 2020-12). Field-for-field, including which properties are nullable vs.
 * optional vs. required — kept in lockstep by hand, same as every other
 * schema in this repo ported from a Blueprint JSON Schema (D9).
 *
 * Every Copiloto command (M06-T03) and the general chat route both
 * return this shape — it's the one output contract for the whole
 * agent-runtime, per AGENT-FLOW-001's own principle that every phase
 * funnels into a single reportable result.
 */
export const orchestratorRouteModuleSchema = z.enum([
  "ORQ-COP-001",
  "AGENTE-Copiloto-007",
  "COP-PROD-001",
  "COP-OPS-001",
]);

export const orchestratorOutputSchema = z
  .object({
    status: z.enum(["OK", "BLOQUEADO", "CONDICIONAL", "ERRO"]),
    route: z
      .object({
        module: orchestratorRouteModuleSchema,
        action: z.string(),
      })
      .strict(),
    read_scope: z.array(z.string()).min(1),
    write_policy: z
      .object({
        allowed: z.boolean(),
        targets: z.array(z.string()),
        requires_human_confirmation: z.boolean().default(false),
      })
      .strict(),
    state_transition: z
      .object({
        object_id: z.string(),
        from: z.string(),
        to: z.string(),
        guards: z.array(z.string()),
      })
      .strict()
      .nullable()
      .optional(),
    derived_progress_pct: z.number().min(0).max(100).nullable().optional(),
    ui: z
      .object({
        headline: z.string(),
        agora: z.string(),
        tempo: z.string().nullable().optional(),
        conclui_quando: z.string().nullable().optional(),
        evidencia: z.string().nullable().optional(),
        proxima_acao: z.string(),
        mermaid: z.string().nullable().optional(),
      })
      .strict(),
    warnings: z.array(z.string()).optional(),
  })
  .strict();

export type OrchestratorOutput = z.infer<typeof orchestratorOutputSchema>;

/**
 * M06-T02: validate every agent turn's output before acting on it or
 * returning it to the client — never trust an assembled object (whether
 * built deterministically by a command or produced by the LLM) without
 * running it back through the contract first.
 */
export const validateOrchestratorOutput = (
  value: unknown
): OrchestratorOutput => orchestratorOutputSchema.parse(value);
