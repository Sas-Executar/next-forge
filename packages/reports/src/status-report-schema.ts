import { z } from "zod";

/**
 * Zod mirror of SPEC-ROUTINES-001 §4's StatusReport JSON contract
 * (Blueprint, read-only). Field-for-field, same lockstep-by-hand
 * discipline as every other schema ported from a Blueprint contract in
 * this repo (D9) — this is also the exact shape
 * packages/database/prisma/schema.prisma's StatusReport model stores
 * (progress/triptych/now/properties as Json columns), so a row read
 * back from the database and a freshly-built report share one type.
 *
 * `status` (REPORT_STATUS in the spec) has no enumerated vocabulary in
 * the source — reusing the OK/BLOQUEADO/CONDICIONAL/ERRO set
 * packages/agent-runtime's orchestrator-output contract already
 * defines (M06) is an inferred convention for internal consistency,
 * not something the spec itself states.
 */
export const reportStatusSchema = z.enum([
  "OK",
  "BLOQUEADO",
  "CONDICIONAL",
  "ERRO",
]);

const triptychEntrySchema = z.object({
  title: z.string(),
  state: z.string(),
});

export const statusReportSchema = z.object({
  report_id: z.string(),
  run_id: z.string().nullable(),
  project_id: z.string().nullable(),
  generated_at: z.string(),
  status: reportStatusSchema,
  progress: z.object({
    project_percent: z.number().min(0).max(100),
    cycle_current: z.string().nullable(),
    today_delta: z.number(),
  }),
  triptych: z.object({
    previous: triptychEntrySchema.nullable(),
    current: triptychEntrySchema.nullable(),
    next: triptychEntrySchema.nullable(),
  }),
  now: z
    .object({
      action_id: z.string(),
      title: z.string(),
      duration: z.string().nullable(),
      completion_criterion: z.string().nullable(),
      evidence_required: z.string().nullable(),
    })
    .nullable(),
  properties: z.object({
    context: z.string(),
    problem: z.string(),
    process: z.string(),
    progress: z.string(),
    next_1: z.string().nullable(),
    next_2: z.string().nullable(),
    next_3: z.string().nullable(),
    risk: z.string(),
    prevention: z.string(),
    delivery: z.string(),
  }),
  evidence_refs: z.array(z.string()),
  gaps: z.array(z.string()),
});

export type StatusReport = z.infer<typeof statusReportSchema>;

export const validateStatusReport = (value: unknown): StatusReport =>
  statusReportSchema.parse(value);
