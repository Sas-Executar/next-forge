"use server";

import { requireRole } from "@repo/auth/server";
import { createCheckoutSession, createPortalSession } from "@repo/billing";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const checkoutInputSchema = z.object({
  plan: z.enum(["SOLO", "PRO", "BUSINESS"]),
  interval: z.enum(["month", "year"]),
});

const originFromHeaders = async (): Promise<string> => {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host");
  if (!host) {
    throw new Error(
      "Missing Host header — cannot build a checkout redirect URL."
    );
  }
  return `${proto}://${host}`;
};

/**
 * M13-T04 — starts a Stripe Checkout session for a self-serve plan and
 * redirects to it. Takes `FormData` (not a typed object) so it can be
 * used directly as a `<form action={startCheckout}>` handler — Next's
 * documented shape for a form-bound server action — with `plan`/
 * `interval` as hidden fields the settings page sets per button.
 * `redirect()` (next/navigation) is Next's own mechanism for a server
 * action to navigate the browser: it throws a special signal Next
 * intercepts, not a normal return.
 */
export const startCheckout = async (formData: FormData): Promise<never> => {
  const { plan, interval } = checkoutInputSchema.parse({
    plan: formData.get("plan"),
    interval: formData.get("interval"),
  });
  const { workspace } = await requireRole("OWNER");
  const origin = await originFromHeaders();

  const { url } = await createCheckoutSession(workspace.id, {
    plan,
    interval,
    successUrl: `${origin}/settings/billing?checkout=success`,
    cancelUrl: `${origin}/settings/billing?checkout=cancelled`,
  });

  if (!url) {
    throw new Error("Stripe did not return a Checkout Session URL.");
  }
  redirect(url);
};

/** M13-T04 — redirects to Stripe's hosted billing portal for the caller's workspace. */
export const openBillingPortal = async (): Promise<never> => {
  const { workspace } = await requireRole("OWNER");
  const origin = await originFromHeaders();

  const { url } = await createPortalSession(
    workspace.id,
    `${origin}/settings/billing`
  );
  redirect(url);
};
