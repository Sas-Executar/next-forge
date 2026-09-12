import "server-only";

import { forSystemJob, forWorkspace } from "@repo/database";
import type { Stripe } from "@repo/payments";
import type { SubscriptionPlan, SubscriptionStatus } from "@repo/schemas";

export class UnresolvedWorkspaceError extends Error {
  constructor(stripeCustomerId: string) {
    super(
      `No Subscription row found for Stripe customer ${stripeCustomerId} — it was never created via createCheckoutSession(), or the workspace has since been deleted.`
    );
    this.name = "UnresolvedWorkspaceError";
  }
}

/**
 * Stripe's 8-state Subscription.status collapsed onto this schema's own
 * 4-state SubscriptionStatus (M02's deliberate simplification, not
 * something this milestone expands without reason). `incomplete` /
 * `unpaid` / `paused` all map to PAST_DUE — closer semantically to "not
 * currently payable, needs action" than either ACTIVE or CANCELED;
 * `incomplete_expired` maps to CANCELED — the subscription never
 * activated and Stripe will not retry it.
 */
const mapStripeStatus = (
  status: Stripe.Subscription.Status
): SubscriptionStatus => {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "incomplete":
    case "unpaid":
    case "paused":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default: {
      const exhaustive: never = status;
      throw new Error(
        `Unhandled Stripe subscription status: ${exhaustive as string}`
      );
    }
  }
};

const planFromStripeSubscription = (
  subscription: Stripe.Subscription
): SubscriptionPlan | null => {
  const fromMetadata = subscription.metadata?.plan;
  if (
    fromMetadata === "TRIAL" ||
    fromMetadata === "SOLO" ||
    fromMetadata === "PRO" ||
    fromMetadata === "BUSINESS" ||
    fromMetadata === "ENTERPRISE"
  ) {
    return fromMetadata;
  }
  return null;
};

export interface SubscriptionSyncResult {
  readonly plan: SubscriptionPlan;
  readonly previousPlan: SubscriptionPlan;
  readonly previousStatus: SubscriptionStatus;
  readonly status: SubscriptionStatus;
  readonly workspaceId: string;
}

/**
 * M13-T04 — `customer.subscription.*` webhook handler. A Stripe webhook
 * arrives with only a Stripe customer/subscription id, no workspaceId —
 * resolved here via `forSystemJob()`'s narrow, read-only cross-tenant
 * discovery (the same shape M10/M11 established for the routines
 * scheduler and inbound integration webhooks;
 * `packages/database/prisma/migrations/*_subscription_billing` adds the
 * matching policy for `Subscription`). The actual write always goes
 * through `forWorkspace(workspaceId)` once resolved — no bypass.
 *
 * Returns the before/after plan+status (M15-T02) so the caller can
 * derive which `billing.*` business event this transition represents
 * (`packages/observability/business-events.ts`) without packages/billing
 * itself depending on packages/observability — metrics.ts already
 * depends on @repo/billing/plans, so the reverse dependency would be
 * circular.
 */
export const syncSubscriptionFromStripe = async (
  stripeSubscription: Stripe.Subscription
): Promise<SubscriptionSyncResult> => {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const existing = await forSystemJob().subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!existing) {
    throw new UnresolvedWorkspaceError(customerId);
  }

  const plan = planFromStripeSubscription(stripeSubscription) ?? existing.plan;
  const status = mapStripeStatus(stripeSubscription.status);
  const currentPeriodItem = stripeSubscription.items.data[0];

  await forWorkspace(existing.workspaceId).subscription.update({
    where: { workspaceId: existing.workspaceId },
    data: {
      stripeSubscriptionId: stripeSubscription.id,
      plan,
      status,
      currentPeriodEnd: currentPeriodItem
        ? new Date(currentPeriodItem.current_period_end * 1000)
        : null,
    },
  });

  return {
    workspaceId: existing.workspaceId,
    previousPlan: existing.plan,
    plan,
    previousStatus: existing.status,
    status,
  };
};

/**
 * `customer.subscription.deleted` — Stripe's own terminal event for a
 * cancellation, handled separately from `syncSubscriptionFromStripe`
 * since a deleted Stripe subscription's `.status` is already
 * `"canceled"` by the time this fires (mapStripeStatus already covers
 * it), but this exists as its own named entry point so the webhook route
 * reads as "these two things can happen", matching Stripe's own event
 * taxonomy 1:1 rather than collapsing them silently.
 */
export const handleSubscriptionDeleted = syncSubscriptionFromStripe;

/**
 * M15-T02 — resolves the workspace owning a Stripe customer id, for
 * webhook events (`invoice.paid`/`invoice.payment_failed`) that carry
 * no subscription-shaped payload to run through
 * `syncSubscriptionFromStripe`. Same `forSystemJob()` discovery, same
 * narrow read-only carve-out — no write happens here.
 */
export const resolveWorkspaceByStripeCustomerId = async (
  customerId: string
): Promise<string> => {
  const existing = await forSystemJob().subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!existing) {
    throw new UnresolvedWorkspaceError(customerId);
  }
  return existing.workspaceId;
};
