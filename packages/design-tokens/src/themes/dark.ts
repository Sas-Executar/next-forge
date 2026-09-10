import { azure, green } from "../primitives";
import type { SemanticTokens } from "../semantic";

/**
 * EXECUTAR dark theme — ADR-DS-001 Required Change #6, a disclosed
 * product decision (not a silent omission, matching this codebase's own
 * transparency precedent for token-source gaps).
 *
 * The Blueprint source (references/design-system/variables.css) supplies
 * exactly one ramp per hue, oriented for light backgrounds — its darkest
 * neutral step (neutral-12, #4B4A4A) is a mid-gray, not a usable dark-mode
 * background/surface. No dark-specific ramp exists to port. Rather than
 * continue shipping the generic Next Forge/shadcn oklch grays as "dark
 * mode" — the exact problem ADR-DS-001 names ("Dark mode permanece
 * baseado nos tokens originais do Next Forge") — this file defines real
 * EXECUTAR-branded dark surfaces:
 *
 *   - `darkNeutral`, a dedicated near-black scale below. These are NEW hex
 *     values authored for this ADR, not sourced from the Blueprint —
 *     picked to sit correctly under the *existing* Green/Azure ramps,
 *     whose brighter steps (green-8, azure-7) already have enough
 *     contrast to reuse as-is against a dark ground.
 *   - status.warning/error use brighter steps of the same hue family as
 *     the light theme's disclosed fallbacks (see semantic.ts), for
 *     WCAG contrast against a dark background.
 *
 * This is a real, usable starting point for the ADR's Visual QA
 * acceptance criterion — not a final, designer-approved palette. Flagged
 * here so a future design pass swaps `darkNeutral` for real
 * Blueprint-sourced values once the source publishes them, rather than
 * this being mistaken for verbatim Blueprint data the way the light theme
 * mostly is.
 */
export const darkNeutral = {
  1: "#0a0a0a",
  2: "#141414",
  3: "#1c1c1c",
  4: "#242424",
  5: "#2c2c2c",
  6: "#383838",
  7: "#4a4a4a",
  8: "#5e5e5e",
  9: "#7c7b7b",
  10: "#a3a3a3",
  11: "#d4d4d4",
  12: "#f5f5f5",
} as const;

export const dark: SemanticTokens = {
  color: {
    background: darkNeutral[1],
    surface: darkNeutral[2],
    text: {
      primary: darkNeutral[12],
      secondary: darkNeutral[10],
    },
    action: {
      primary: green[8],
      secondary: darkNeutral[4],
    },
    status: {
      success: green[8],
      warning: "#f59e0b", // amber-500 — brighter than light's amber-700
      error: "#f87171", // red-400 — brighter than light's red-600
    },
    border: darkNeutral[5],
    focus: azure[7],
  },
};
