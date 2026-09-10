import "server-only";

import { forWorkspace } from "@repo/database";
import type { SubscriptionPlan } from "@repo/schemas";
import {
  computeArr,
  computeContribution,
  computeContributionMargin,
  monthlyRecurringRevenueCentavos,
} from "./metrics";

export interface WorkspaceEconomicSnapshot {
  readonly aiCogsBrl: number;
  readonly arrCentavos: number;
  readonly channelCogsBrl: number;
  readonly contributionBrl: number | null;
  readonly contributionMargin: number | null;
  readonly mrrCentavos: number;
  readonly periodEnd: Date;
  readonly periodStart: Date;
  readonly plan: SubscriptionPlan;
  readonly workspaceId: string;
}

/**
 * M15-T04's real data source for the economic dashboard —
 * **single-workspace**, not the platform-wide cross-tenant aggregate
 * OBS-BIZ-001 §9's dashboard list implies ("MRR/ARR... paid accounts").
 * Computing a true platform MRR needs aggregating every workspace's
 * Subscription row, which needs a `forSystemJob()`-style RLS carve-out
 * (packages/database/rls.ts) that doesn't exist for Subscription in a
 * read-many-for-reporting shape today (M13 only added one for the
 * Stripe webhook's single-customer discovery) — a real, disclosed
 * architectural decision this milestone doesn't make unilaterally.
 * This returns one workspace's own contribution to those totals, which
 * `recognizedRevenueBrl` here treats as the workspace's own recurring-
 * revenue commitment (its plan price), not reconciled Stripe invoice
 * data (OBS-BIZ-001 §10's `observed_reconciled` state — no such
 * reconciliation job exists yet, disclosed in ai-cost.ts/business-
 * events.ts too).
 */
export const getWorkspaceEconomicSnapshot = async (
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<WorkspaceEconomicSnapshot> => {
  const db = forWorkspace(workspaceId);
  const [subscription, aiUsageAgg, channelCostAgg] = await Promise.all([
    db.subscription.findUnique({ where: { workspaceId } }),
    db.aIUsage.aggregate({
      where: { createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { costBrl: true },
    }),
    db.telemetryEvent.aggregate({
      where: {
        eventName: "channel.cost_recorded",
        occurredAt: { gte: periodStart, lt: periodEnd },
      },
      _sum: { costBrl: true },
    }),
  ]);

  const plan = subscription?.plan ?? "TRIAL";
  const mrrCentavos = subscription
    ? monthlyRecurringRevenueCentavos(plan, "monthly")
    : 0;
  const aiCogsBrl = Number(aiUsageAgg._sum.costBrl ?? 0);
  const channelCogsBrl = Number(channelCostAgg._sum.costBrl ?? 0);
  const recognizedRevenueBrl = mrrCentavos / 100;

  const contributionBrl =
    recognizedRevenueBrl === 0
      ? null
      : computeContribution({
          recognizedRevenue: recognizedRevenueBrl,
          taxProvision: 0, // GAP (OBS-PLAN-001): no real tax regime/provision source wired.
          paymentFees: 0, // GAP: no real Stripe fee reconciliation wired.
          aiCogs: aiCogsBrl,
          channelCogs: channelCogsBrl,
          variableInfraCogs: 0, // GAP: no infra cost attribution source wired.
          otherVariableServiceCogs: 0,
        });

  return {
    workspaceId,
    plan,
    mrrCentavos,
    arrCentavos: computeArr(mrrCentavos),
    aiCogsBrl,
    channelCogsBrl,
    contributionBrl,
    contributionMargin:
      contributionBrl === null
        ? null
        : computeContributionMargin(contributionBrl, recognizedRevenueBrl),
    periodStart,
    periodEnd,
  };
};
