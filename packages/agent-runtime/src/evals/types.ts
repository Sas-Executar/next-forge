import { z } from "zod";

/**
 * M17-T03 — TEST-007's real field list (Blueprint, read-only, the one
 * substantive line `docs/12-testing-evals/EVAL_DATASET_SCHEMA.md`
 * actually specifies): "Campos mínimos: case_id, capability, input,
 * context, expected, forbidden, grader, severity, tags." Everything
 * else about the eval system — grader implementations, thresholds,
 * pass/fail policy — is a bare, contentless template in the Blueprint
 * (TEST-008 `GRADERS.md`, TEST-009 `QUALITY_GATES.md`, TEST-006
 * `AGENT_EVAL_STRATEGY.md`, all `status: draft` with a one-line
 * "Template para..." body and no rows) — code-owned below, same
 * disclosure discipline as M16's permission matrix.
 *
 * `grader` is a closed enum here, not the free-form TBD string the
 * Blueprint's 3 seed rows carry — this repo only implements the two
 * graders `graders.ts` actually defines; adding a third grader means
 * adding it there first, not writing a string this schema can't run.
 */
export const evalSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type EvalSeverity = z.infer<typeof evalSeveritySchema>;

export const evalGraderSchema = z.enum(["schema", "forbidden_absent"]);
export type EvalGrader = z.infer<typeof evalGraderSchema>;

/**
 * `input`/`context`/`expected` stay `z.unknown()`/`z.record()` — their
 * real shape depends on which `grader` a case names (the "schema"
 * grader's `input` is a candidate OrchestratorOutput; the
 * "forbidden_absent" grader's `input` is any JSON value to search).
 * Validated more specifically per-grader in `run-eval-case.ts`, not
 * here — this schema only proves a case is well-formed as a TEST-007
 * row, not that its payload matches its grader.
 */
export const evalCaseSchema = z.object({
  case_id: z.string().min(1),
  capability: z.string().min(1),
  input: z.unknown(),
  context: z.record(z.string(), z.unknown()).default({}),
  expected: z.unknown(),
  forbidden: z.array(z.string()).default([]),
  grader: evalGraderSchema,
  severity: evalSeveritySchema,
  tags: z.array(z.string()).default([]),
});

export type EvalCase = z.infer<typeof evalCaseSchema>;

export const evalCaseFileSchema = evalCaseSchema.array();
