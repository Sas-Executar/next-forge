import "server-only";

import { forWorkspace } from "@repo/database";
import { stripe } from "@repo/payments";
import type { SubscriptionPlan } from "@repo/schemas";
import { StripeNotConfiguredError } from "./products";

export class SubscriptionNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`No Subscription row for workspace ${workspaceId}.`);
    this.name = "SubscriptionNotFoundError";
  }
}

export class NoStripeCustomerError extends Error {
  constructor(workspaceId: string) {
    super(
      `Workspace ${workspaceId} has no stripeCustomerId yet — create a checkout session first.`
    );
    this.name = "NoStripeCustomerError";
  }
}

/**
 * M13-T04 — Checkout for a self-serve plan. PRICING-001 §8's own
 * payment-method policy (PROPOSED): "cartão nacional; Pix; boleto para
 * Business quando aplicável" — boleto is added only for Business, card +
 * Pix on every self-serve plan (Solo/Pro/Business), matching the doc
 * exactly rather than offering every method everywhere.
 *
 * Ensures (or reuses) a Stripe Customer for the workspace, resolves the
 * real synced Price via its `lookup_key` (products.ts's own idempotent
 * naming, `executar_<plan>_<interval>`) rather than a hardcoded price
 * id, and creates a subscription-mode Checkout Session.
 */
export const createCheckoutSession = async (
  workspaceId: string,
  input: {
    readonly plan: SubscriptionPlan;
    readonly interval: "month" | "year";
    readonly successUrl: string;
    readonly cancelUrl: string;
  }
): Promise<{ readonly url: string | null; readonly sessionId: string }> => {
  if (!stripe) {
    throw new StripeNotConfiguredError();
  }
  const client = stripe;

  const db = forWorkspace(workspaceId);
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
  });
  let subscription = await db.subscription.findUnique({
    where: { workspaceId },
  });

  let customerId = subscription?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await client.customers.create({
      name: workspace.name,
      metadata: { workspaceId },
    });
    customerId = customer.id;
    subscription = await db.subscription.upsert({
      where: { workspaceId },
      create: { workspaceId, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    });
  }

  const lookupKey = `executar_${input.plan.toLowerCase()}_${input.interval}`;
  const prices = await client.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      `No synced Stripe Price for lookup_key "${lookupKey}" — run syncStripeProducts() first (M13-T01).`
    );
  }

  const paymentMethodTypes: ("card" | "pix" | "boleto")[] =
    input.plan === "BUSINESS" ? ["card", "pix", "boleto"] : ["card", "pix"];

  const session = await client.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    payment_method_types: paymentMethodTypes,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { workspaceId, plan: input.plan },
    subscription_data: { metadata: { workspaceId, plan: input.plan } },
  });

  return { url: session.url, sessionId: session.id };
};

/** M13-T04 — Stripe's own hosted billing portal (manage payment method, view invoices, cancel). */
export const createPortalSession = async (
  workspaceId: string,
  returnUrl: string
): Promise<{ readonly url: string }> => {
  if (!stripe) {
    throw new StripeNotConfiguredError();
  }
  const client = stripe;

  const subscription = await forWorkspace(workspaceId).subscription.findUnique({
    where: { workspaceId },
  });
  if (!subscription) {
    throw new SubscriptionNotFoundError(workspaceId);
  }
  if (!subscription.stripeCustomerId) {
    throw new NoStripeCustomerError(workspaceId);
  }

  const session = await client.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
};
