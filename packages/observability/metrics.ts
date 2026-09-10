import { PLAN_DEFINITIONS } from "@repo/billing/plans";
import type { SubscriptionPlan } from "@repo/schemas";

/**
 * OBS-BIZ-001 §6 (Blueprint, read-only) canonical formulas, verbatim.
 * Pure — no I/O, no `@repo/database` import — so these are testable
 * directly without `DATABASE_URL`, and reusable from whatever
 * eventually aggregates them across workspaces (M15 doesn't build that
 * aggregator; see `workspace-metrics.ts`'s own header comment on why).
 * Split from the DB-backed `getWorkspaceEconomicSnapshot()`
 * (workspace-metrics.ts) for the same reason `packages/billing`'s
 * entitlements.ts/workspace-entitlements.ts split in M13: importing
 * `@repo/database` eagerly validates `DATABASE_URL` at module load,
 * which a pure formula has no business requiring.
 */
export const computeArr = (mrr: number): number => mrr * 12;

export const computeArpa = (mrr: number, paidAccounts: number): number =>
  paidAccounts === 0 ? 0 : mrr / paidAccounts;

export const computeArpu = (mrr: number, paidUsers: number): number =>
  paidUsers === 0 ? 0 : mrr / paidUsers;

export const computeCac = (
  salesAndMarketingSpend: number,
  newPayingAccounts: number
): number | null =>
  newPayingAccounts === 0 ? null : salesAndMarketingSpend / newPayingAccounts;

export const computeCacPaybackMonths = (
  cac: number,
  monthlyContributionPerNewAccount: number
): number | null =>
  monthlyContributionPerNewAccount === 0
    ? null
    : cac / monthlyContributionPerNewAccount;

export interface ContributionInputs {
  readonly aiCogs: number;
  readonly channelCogs: number;
  readonly otherVariableServiceCogs: number;
  readonly paymentFees: number;
  readonly recognizedRevenue: number;
  readonly taxProvision: number;
  readonly variableInfraCogs: number;
}

export const computeContribution = (inputs: ContributionInputs): number =>
  inputs.recognizedRevenue -
  inputs.taxProvision -
  inputs.paymentFees -
  inputs.aiCogs -
  inputs.channelCogs -
  inputs.variableInfraCogs -
  inputs.otherVariableServiceCogs;

export const computeContributionMargin = (
  contribution: number,
  recognizedRevenue: number
): number | null =>
  recognizedRevenue === 0 ? null : contribution / recognizedRevenue;

export const computeLogoChurn = (
  lostPayingAccounts: number,
  payingAccountsAtPeriodStart: number
): number | null =>
  payingAccountsAtPeriodStart === 0
    ? null
    : lostPayingAccounts / payingAccountsAtPeriodStart;

export const computeGrossRevenueChurn = (
  lostAndContractionMrr: number,
  mrrAtPeriodStart: number
): number | null =>
  mrrAtPeriodStart === 0 ? null : lostAndContractionMrr / mrrAtPeriodStart;

/**
 * PRICING-001 §6-derived monthly-normalized recurring revenue for one
 * subscription (annual plans divided by 12) — the per-account input
 * OBS-BIZ-001 §6's MRR formula sums across every paying account.
 */
export const monthlyRecurringRevenueCentavos = (
  plan: SubscriptionPlan,
  interval: "monthly" | "annual" | null
): number => {
  const definition = PLAN_DEFINITIONS[plan];
  if (interval === "annual" && definition.annualPriceCentavos !== null) {
    return definition.annualPriceCentavos / 12;
  }
  return definition.monthlyPriceCentavos ?? 0;
};

/**
 * OBS-BIZ-001 §7 / OBS-006 §4 — the exact same PROPOSED guardrail
 * numbers appear in both docs for AI COGS/revenue; §7 adds contribution
 * margin and CAC payback. Verbatim thresholds, explicitly labeled
 * PROPOSED in both source documents — "não benchmarks observados do
 * EXECUTAR" — not this codebase's own invention.
 */
export const ECONOMIC_GUARDRAILS: Readonly<
  Record<
    "SOLO" | "PRO" | "BUSINESS",
    {
      readonly aiCogsToRevenueMax: number;
      readonly contributionMarginMin: number;
      readonly cacPaybackMonthsMax: number;
    }
  >
> = {
  SOLO: {
    aiCogsToRevenueMax: 0.08,
    contributionMarginMin: 0.7,
    cacPaybackMonthsMax: 6,
  },
  PRO: {
    aiCogsToRevenueMax: 0.1,
    contributionMarginMin: 0.65,
    cacPaybackMonthsMax: 6,
  },
  BUSINESS: {
    aiCogsToRevenueMax: 0.12,
    contributionMarginMin: 0.6,
    cacPaybackMonthsMax: 9,
  },
};
