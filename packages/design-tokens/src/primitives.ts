/**
 * Primitive tokens — the EXECUTAR Design System's single source of truth
 * (ADR-DS-001). Ported verbatim from
 * Executar-app-Blueprint/references/design-system/variables.css (UI-005,
 * read-only source, CORPUS_DIRECT extract). Ramp naming (1-12) kept
 * verbatim from the source.
 *
 * This file is the ONE place these values are typed. `css/variables.css`
 * mirrors it 1:1 by hand — `scripts/check-token-drift.ts` (ADR-DS-001
 * Required Change #10) diffs the two on every CI run so they can't drift
 * apart silently.
 *
 * Nothing outside this package and `src/semantic.ts`/`src/themes/*` should
 * import these ramps directly — product code consumes the semantic layer
 * (`src/semantic.ts`) instead (ADR-DS-001's Semantic Layer section).
 */

export const green = {
  1: "#fcfdfc",
  2: "#f3faf6",
  3: "#e4f6ed",
  4: "#cff4e2",
  5: "#b4f4d5",
  6: "#8bf6c2",
  7: "#58fbad",
  8: "#1fff93",
  9: "#00bf63",
  10: "#008c49",
  11: "#007a45",
  12: "#064727",
} as const;

export const azure = {
  1: "#fcfcfd",
  2: "#f3f6fa",
  3: "#e4edf6",
  4: "#cfe2f4",
  5: "#b4d5f4",
  6: "#8bc2f6",
  7: "#58acfb",
  /**
   * Interpolated, NOT a value supplied by the source file: the Blueprint
   * source has azure-8 as a verbatim duplicate of azure-9 (#1F93FF) — a
   * known token-source gap. Per explicit product decision (disclosed, not
   * silently patched), this is the midpoint between azure-7 and azure-9.
   * Matches the disclosure already carried in
   * packages/design-system/styles/globals.css.
   */
  8: "#3ca0fd",
  9: "#1f93ff",
  10: "#007aeb",
  11: "#0b6fd3",
  12: "#062747",
} as const;

export const neutral = {
  1: "#ffffff",
  2: "#f6f6f6",
  3: "#f0f0f0",
  4: "#eaeaea",
  5: "#e4e4e4",
  6: "#dedede",
  7: "#c5c5c5",
  8: "#adadad",
  9: "#959494",
  10: "#7c7b7b",
  11: "#646363",
  12: "#4b4a4a",
} as const;

export const primitives = { green, azure, neutral } as const;

export type Ramp = typeof green;
export type RampStep = keyof Ramp;
