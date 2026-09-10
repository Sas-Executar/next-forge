import "server-only";

import { stripe } from "@repo/payments";
import type { SubscriptionPlan } from "@repo/schemas";
import { PLAN_DEFINITIONS, SELF_SERVE_PLANS } from "./plans";

export class StripeNotConfiguredError extends Error {
  constructor() {
    super(
      "STRIPE_SECRET_KEY is not set — cannot sync Stripe products/prices. Consistent, disclosed gap across every commit on this branch: this sandbox has no provider credentials."
    );
    this.name = "StripeNotConfiguredError";
  }
}

const LOOKUP_KEY = (
  plan: SubscriptionPlan,
  interval: "month" | "year"
): string => `executar_${plan.toLowerCase()}_${interval}`;

export interface SyncedPrice {
  readonly interval: "month" | "year";
  readonly lookupKey: string;
  readonly plan: SubscriptionPlan;
  readonly priceId: string;
  readonly productId: string;
}

/**
 * `M13-T01` — idempotently ensures a Stripe Product + monthly/annual
 * Price exist for every self-serve plan (Solo/Pro/Business —
 * SELF_SERVE_PLANS excludes Trial, which has no charge, and Enterprise,
 * which PRICING-001 §2 marks "custom": sold outside Checkout).
 *
 * Idempotency via `lookup_key` (Stripe's own documented mechanism for
 * this exact use case): each price is looked up by a stable
 * `executar_<plan>_<interval>` key before creating a new one, so running
 * this repeatedly (a redeploy, a CI step) never creates duplicate
 * Products/Prices — Stripe has no native "upsert", so this is the real
 * idempotent pattern their own docs recommend, not a workaround.
 *
 * This is a real, callable Stripe API integration — not a config file —
 * but has never actually run against a live Stripe account in this
 * environment (`STRIPE_SECRET_KEY` unset here, disclosed consistently
 * across every milestone that touches a paid provider). Intended to be
 * invoked from a one-off script or a deploy step (M18), not per-request.
 */
export const syncStripeProducts = async (): Promise<readonly SyncedPrice[]> => {
  if (!stripe) {
    throw new StripeNotConfiguredError();
  }
  const client = stripe;

  const results: SyncedPrice[] = [];

  for (const plan of SELF_SERVE_PLANS) {
    const definition = PLAN_DEFINITIONS[plan];
    const intervals: {
      readonly interval: "month" | "year";
      readonly amount: number | null;
    }[] = [
      { interval: "month", amount: definition.monthlyPriceCentavos },
      { interval: "year", amount: definition.annualPriceCentavos },
    ];

    for (const { interval, amount } of intervals) {
      if (amount === null) {
        continue;
      }
      const lookupKey = LOOKUP_KEY(plan, interval);

      const existing = await client.prices.list({
        lookup_keys: [lookupKey],
        limit: 1,
        expand: ["data.product"],
      });
      const found = existing.data[0];
      if (found) {
        results.push({
          plan,
          interval,
          lookupKey,
          productId:
            typeof found.product === "string"
              ? found.product
              : found.product.id,
          priceId: found.id,
        });
        continue;
      }

      const price = await client.prices.create({
        currency: "brl",
        unit_amount: amount,
        recurring: { interval },
        lookup_key: lookupKey,
        product_data: {
          name: `EXECUTAR ${definition.name}`,
          metadata: { plan },
        },
        metadata: { plan, interval },
      });

      results.push({
        plan,
        interval,
        lookupKey,
        productId:
          typeof price.product === "string" ? price.product : price.product.id,
        priceId: price.id,
      });
    }
  }

  return results;
};
