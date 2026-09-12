import { z } from "zod";

/**
 * Canonical Subscription plan/status vocabulary (D9 — single definition
 * point, mirrored from packages/database/prisma/schema.prisma's
 * SubscriptionPlan/SubscriptionStatus enums, same discipline
 * TaskState/VisualSymbolSemantic already follow). packages/billing
 * (M13) needs these from a DB-independent context (the entitlement
 * table is pure data, no I/O) — importing @repo/database's Prisma types
 * directly would pull `import "server-only"` into anything that reads
 * the entitlement table.
 */
export const subscriptionPlanSchema = z.enum([
  "TRIAL",
  "SOLO",
  "PRO",
  "BUSINESS",
  "ENTERPRISE",
]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const subscriptionStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
