import { readFileSync } from "node:fs";
import { type EvalCase, evalCaseSchema } from "./types";

/**
 * Reads one TEST-007-shaped `.jsonl` file (one JSON object per line —
 * `evals/{datasets,adversarial,regression}/*.jsonl`) and validates every
 * row against `evalCaseSchema` before handing it back. A malformed row
 * fails the load with the exact file/line/reason rather than silently
 * skipping it or letting a bad case reach `gradeEvalCase()` and produce
 * a confusing runtime error instead.
 */
export const loadEvalCases = (jsonlPath: string): EvalCase[] =>
  readFileSync(jsonlPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        throw new Error(
          `${jsonlPath}:${index + 1} is not valid JSON: ${(error as Error).message}`
        );
      }

      const result = evalCaseSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(
          `${jsonlPath}:${index + 1} does not match evalCaseSchema: ${result.error.message}`
        );
      }
      return result.data;
    });
