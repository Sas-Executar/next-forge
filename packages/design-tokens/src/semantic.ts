/**
 * Semantic layer (ADR-DS-001 "Semantic Layer" section — token names kept
 * verbatim from the ADR): color.background, color.surface,
 * color.text.primary, color.text.secondary, color.action.primary,
 * color.action.secondary, color.status.success, color.status.warning,
 * color.status.error, color.border, color.focus.
 *
 * Product code (components, apps/*) MUST consume these — never a bare
 * ramp step (green-9, azure-8, etc.) directly — per the ADR's own rule.
 * Ramp steps are referenced only here and in src/themes/*, where each
 * theme resolves every semantic token to a concrete value.
 */
export interface SemanticColorTokens {
  action: {
    primary: string;
    secondary: string;
  };
  background: string;
  border: string;
  focus: string;
  status: {
    success: string;
    warning: string;
    error: string;
  };
  surface: string;
  text: {
    primary: string;
    secondary: string;
  };
}

export interface SemanticTokens {
  color: SemanticColorTokens;
}

/**
 * Disclosed gap: the Blueprint source (references/design-system/
 * variables.css) supplies Green/Azure/Neutral ramps only — no warning
 * (amber) or error (red) ramp exists, for either theme. Rather than
 * fabricate a full 12-step ramp the source doesn't provide, these fixed,
 * standard hex values are used directly by src/themes/light.ts — matching
 * the transparency precedent already set for --destructive in
 * packages/design-system/styles/globals.css (which used a stock oklch red
 * for the same reason). src/themes/dark.ts uses brighter variants of the
 * same hue for dark-background contrast; see that file's own comment.
 * Revisit once the Blueprint publishes real warning/error ramps.
 */
export const statusFallbackLight = {
  warning: "#b45309", // amber-700 — not a Blueprint token, disclosed gap
  error: "#dc2626", // red-600 — not a Blueprint token, disclosed gap
} as const;
