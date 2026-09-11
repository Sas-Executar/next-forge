import { createFlag } from "./lib/create-flag";

export const showBetaFeature = createFlag("showBetaFeature");

/**
 * Fase 9 (PLANO_EXECUTAR_COPILOTO.md's own Fase 9 wording: "Rollout
 * atrás de feature flag showCopiloto ... tenant a tenant") — same
 * `createFlag()` every other flag in this file uses, so rollout is
 * real PostHog per-user targeting (createFlag's own `decide()` calls
 * `analytics.isFeatureEnabled(key, userId)`), not a hardcoded boolean.
 * Defaults to `false` (createFlag's own default), so a tenant is opted
 * in explicitly rather than the feature shipping dark-launched to
 * everyone. Gates both the sidebar entry (components/sidebar.tsx) and
 * the /copiloto route itself (copiloto/page.tsx) — hiding the link
 * alone would not stop direct navigation.
 */
export const showCopiloto = createFlag("showCopiloto");
