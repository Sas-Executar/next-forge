import { analytics } from "@repo/analytics/server";
import { clerkClient } from "@repo/auth/server";
import {
  resolveWorkspaceByStripeCustomerId,
  type SubscriptionSyncResult,
  syncSubscriptionFromStripe,
} from "@repo/billing";
import {
  type BusinessEventName,
  emitBusinessEvent,
} from "@repo/observability/business-events";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import type { Stripe } from "@repo/payments";
import { stripe } from "@repo/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/env";

const getUserFromCustomerId = async (customerId: string) => {
  const clerk = await clerkClient();
  const users = await clerk.users.getUserList();

  const user = users.data.find(
    (currentUser) => currentUser.privateMetadata.stripeCustomerId === customerId
  );

  return user;
};

const handleCheckoutSessionCompleted = async (
  data: Stripe.Checkout.Session
) => {
  if (!data.customer) {
    return;
  }

  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer.id;
  const user = await getUserFromCustomerId(customerId);

  if (!user) {
    return;
  }

  analytics?.capture({
    event: "User Subscribed",
    distinctId: user.id,
  });
};

const handleSubscriptionScheduleCanceled = async (
  data: Stripe.SubscriptionSchedule
) => {
  if (!data.customer) {
    return;
  }

  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer.id;
  const user = await getUserFromCustomerId(customerId);

  if (!user) {
    return;
  }

  analytics?.capture({
    event: "User Unsubscribed",
    distinctId: user.id,
  });
};

/**
 * M15-T02 — derives which `billing.*` OBS-BIZ-001 event a subscription
 * transition represents from its real before/after plan+status, rather
 * than trusting Stripe's event type name (the same `.created`/
 * `.updated` ambiguity `syncSubscriptionFromStripe`'s own comment
 * already notes — both can carry any of these transitions).
 */
const billingEventForSubscriptionSync = (
  result: SubscriptionSyncResult
): BusinessEventName => {
  if (result.status === "CANCELED") {
    return "billing.subscription_cancelled";
  }
  if (result.previousPlan === "TRIAL" && result.plan !== "TRIAL") {
    return "billing.trial_converted";
  }
  if (result.previousPlan !== result.plan) {
    return "billing.plan_changed";
  }
  if (result.previousStatus !== "ACTIVE" && result.status === "ACTIVE") {
    return "billing.subscription_started";
  }
  return "billing.subscription_renewed";
};

const handleSubscriptionSyncEvent = async (
  stripeSubscription: Stripe.Subscription
) => {
  const result = await syncSubscriptionFromStripe(stripeSubscription);
  await emitBusinessEvent(result.workspaceId, {
    eventName: billingEventForSubscriptionSync(result),
    component: "webhooks/payments",
    outcome: "success",
    metadata: {
      stripeSubscriptionId: stripeSubscription.id,
      previousPlan: result.previousPlan,
      plan: result.plan,
      previousStatus: result.previousStatus,
      status: result.status,
    },
  });
};

/** M15-T02 — `invoice.paid`/`invoice.payment_failed` (OBS-BIZ-001 §4). */
const handleInvoiceEvent = async (
  invoice: Stripe.Invoice,
  outcome: "success" | "error"
) => {
  if (!invoice.customer) {
    return;
  }
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer.id;
  const workspaceId = await resolveWorkspaceByStripeCustomerId(customerId);

  await emitBusinessEvent(workspaceId, {
    eventName:
      outcome === "success" ? "billing.invoice_paid" : "billing.invoice_failed",
    component: "webhooks/payments",
    outcome,
    metadata: {
      invoiceId: invoice.id,
      amountPaidCentavos: invoice.amount_paid,
      amountDueCentavos: invoice.amount_due,
      currency: invoice.currency,
    },
  });
};

export const POST = async (request: Request): Promise<Response> => {
  if (!(stripe && env.STRIPE_WEBHOOK_SECRET)) {
    return NextResponse.json({ message: "Not configured", ok: false });
  }

  try {
    const body = await request.text();
    const headerPayload = await headers();
    const signature = headerPayload.get("stripe-signature");

    if (!signature) {
      throw new Error("missing stripe-signature header");
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      }
      case "subscription_schedule.canceled": {
        await handleSubscriptionScheduleCanceled(event.data.object);
        break;
      }
      // M13-T04 — Subscription.plan/status/currentPeriodEnd mirror
      // (packages/billing's own real ledger, not this generic
      // boilerplate route's original Clerk-user-metadata path above,
      // which stays as-is for the analytics event it already sends).
      // `.created`/`.updated` share one handler since both events carry
      // the subscription's full current state, not a diff — the same
      // upsert-by-current-value shape applies either way.
      // M15-T02: also emits the matching billing.* business event
      // (handleSubscriptionSyncEvent, derived from the real before/
      // after transition, not the Stripe event type name).
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscriptionSyncEvent(event.data.object);
        break;
      }
      // M15-T02 (OBS-BIZ-001 §4).
      case "invoice.paid": {
        await handleInvoiceEvent(event.data.object, "success");
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoiceEvent(event.data.object, "error");
        break;
      }
      default: {
        log.warn(`Unhandled event type ${event.type}`);
      }
    }

    await analytics?.shutdown();

    return NextResponse.json({ result: event, ok: true });
  } catch (error) {
    const message = parseError(error);

    log.error(message);

    return NextResponse.json(
      {
        message: "something went wrong",
        ok: false,
      },
      { status: 500 }
    );
  }
};
