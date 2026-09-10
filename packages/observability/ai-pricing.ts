/**
 * OBS-006 §3/§6 pricing snapshot (Blueprint, read-only, `docs/13-
 * observability/AI_COST_BUDGET.md`) — USD per 1M tokens, input/output,
 * sourced from OpenAI's published API pricing as of this milestone
 * (Sept 2026), not guessed: gpt-4o-mini $0.15/$0.60, gpt-4o $2.50/
 * $10.00, o1 $15.00/$60.00 — matching packages/ai/router.ts's cheap/
 * mid/high tiers exactly. Provider pricing changes; this table is a
 * snapshot to revisit, not a live-fetched rate, and `estimateCostUsd()`
 * returns `null` for any model not in it rather than guessing.
 *
 * Deliberately pure (no `@repo/database` import) — `ai-cost.ts` (the
 * DB-backed `recordAiUsage()`) imports this, but the pricing table
 * itself has no I/O and needs none, same split reasoning as
 * entitlements.ts/workspace-entitlements.ts (packages/billing, M13).
 */
const MODEL_PRICING_USD_PER_MILLION: Readonly<
  Record<string, { readonly input: number; readonly output: number }>
> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  o1: { input: 15, output: 60 },
};

export const estimateCostUsd = (
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null => {
  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  if (!pricing) {
    return null;
  }
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
};
