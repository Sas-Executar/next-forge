import {
  handoffEnvelopeSchema,
  rotinasPropostasLoteSchema,
  scrollTaskUnitSchema,
} from "@repo/schemas";
import type { ZodType } from "zod";
import { orchestratorOutputSchema } from "../output-schema";
import type { EvalCase } from "./types";

export interface GradeResult {
  readonly detail: string;
  readonly pass: boolean;
}

/**
 * Fase 9 — `gradeSchema` originally only ever validated against
 * `orchestratorOutputSchema` (the Camada 2 command output contract),
 * because that was the only schema this eval harness had a case for.
 * Camada 1 (Fases 1/4/5/7) added three more real, tested contracts with
 * their own dedicated pass/fail semantics — `HandoffEnvelope` (illegal
 * fase transitions must fail), the exactly-3 `RotinaProposta` batch, and
 * `ScrollTaskUnit`. Dispatching by a `capability` prefix lets new golden/
 * regression/adversarial cases target those contracts without a case
 * accidentally validating against the wrong schema and passing for the
 * wrong reason. Any capability not matching one of these three prefixes
 * keeps validating against `orchestratorOutputSchema`, unchanged — this
 * is additive, not a behavior change for the 18 pre-existing cases.
 */
const SCHEMA_BY_CAPABILITY_PREFIX: ReadonlyArray<
  readonly [prefix: string, schema: ZodType]
> = [
  ["ativacao.", handoffEnvelopeSchema],
  ["modo_rotina.", rotinasPropostasLoteSchema],
  ["scroll_task.", scrollTaskUnitSchema],
];

const resolveSchemaForCapability = (capability: string): ZodType => {
  const match = SCHEMA_BY_CAPABILITY_PREFIX.find(([prefix]) =>
    capability.startsWith(prefix)
  );
  return match ? match[1] : orchestratorOutputSchema;
};

/**
 * "schema" grader — runs `input` through the real, production schema
 * matching this case's `capability` (see `resolveSchemaForCapability`
 * above; defaults to `orchestratorOutputSchema`, M06-T02, the contract
 * every Copiloto command and the chat route validates against before
 * acting on or returning a result). `expected` must be the literal
 * string `"valid"` or `"invalid"`: pass iff whether parsing actually
 * succeeded matches what the case claims it should do. A golden case
 * proves a real, well-formed output round-trips; an adversarial/
 * regression case proves a malformed or dangerous shape is actually
 * rejected, not just assumed to be.
 */
const gradeSchema = (evalCase: EvalCase): GradeResult => {
  if (evalCase.expected !== "valid" && evalCase.expected !== "invalid") {
    return {
      pass: false,
      detail: `"schema" grader requires expected to be "valid" or "invalid", got ${JSON.stringify(evalCase.expected)}`,
    };
  }

  const schema = resolveSchemaForCapability(evalCase.capability);
  const result = schema.safeParse(evalCase.input);
  const actual = result.success ? "valid" : "invalid";
  if (actual === evalCase.expected) {
    return { pass: true, detail: `parsed as ${actual}, as expected` };
  }
  return {
    pass: false,
    detail: result.success
      ? "expected parsing to fail (invalid) but it succeeded"
      : `expected parsing to succeed (valid) but it failed: ${result.error.message}`,
  };
};

/**
 * "forbidden_absent" grader — stringifies `input` and asserts none of
 * `forbidden`'s strings appear in it (case-insensitive substring
 * match). For adversarial cases that carry injected/malicious display
 * text (e.g. an instruction-injection attempt sitting inside a task
 * title) alongside a structurally valid payload: the "schema" grader
 * alone would pass it (a string field can legitimately contain any
 * text), so this grader checks the injected content never correlates
 * with an elevated `write_policy` or state transition it has no
 * authority to request — proof that content is never interpreted as
 * instruction, only ever displayed as opaque text.
 */
const gradeForbiddenAbsent = (evalCase: EvalCase): GradeResult => {
  if (evalCase.forbidden.length === 0) {
    return {
      pass: false,
      detail: '"forbidden_absent" grader requires a non-empty forbidden[] list',
    };
  }

  const haystack = JSON.stringify(evalCase.input).toLowerCase();
  const found = evalCase.forbidden.filter((marker) =>
    haystack.includes(marker.toLowerCase())
  );

  if (found.length === 0) {
    return { pass: true, detail: "none of the forbidden markers were found" };
  }
  return {
    pass: false,
    detail: `forbidden marker(s) found: ${found.join(", ")}`,
  };
};

export const gradeEvalCase = (evalCase: EvalCase): GradeResult => {
  switch (evalCase.grader) {
    case "schema":
      return gradeSchema(evalCase);
    case "forbidden_absent":
      return gradeForbiddenAbsent(evalCase);
    default: {
      const exhaustive: never = evalCase.grader;
      throw new Error(`Unhandled eval grader: ${exhaustive as string}`);
    }
  }
};
