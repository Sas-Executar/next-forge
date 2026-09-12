import "server-only";

import { forWorkspace, type Prisma } from "@repo/database";
import { newTraceId } from "./trace";

/**
 * OBS-BIZ-001 §4 (Blueprint, read-only, `docs/13-observability/
 * BUSINESS_TELEMETRY.md`) — "Eventos mínimos", verbatim event names.
 * `status: pre_approved` on that doc is explicit that this doesn't mean
 * implemented: "`pre_approved` não significa que os eventos, pipelines,
 * dashboards ou alertas já estejam implementados." This module is that
 * implementation — for the subset of events this codebase has a real
 * mutation to attach them to (every name below is wired from at least
 * one real call site this milestone touches; see each call site's own
 * comment).
 */
export const BUSINESS_EVENT_NAMES = [
  // Revenue/subscription
  "billing.trial_started",
  "billing.trial_converted",
  "billing.subscription_started",
  "billing.subscription_renewed",
  "billing.plan_changed",
  "billing.subscription_cancelled",
  "billing.invoice_paid",
  "billing.invoice_failed",
  "billing.refund_recorded",
  "billing.payment_fee_recorded",
  // Activation/retention
  "product.activation_completed",
  "product.core_action_completed",
  "product.mapa_os_generated",
  "product.scanner_action_completed",
  "product.status_report_generated",
  "product.routine_run_completed",
  // AI
  "ai.usage_recorded",
  "ai.credit_consumed",
  "ai.credit_topup_purchased",
  // WhatsApp/paid channels
  "channel.message_sent",
  "channel.message_delivered",
  "channel.message_failed",
  "channel.cost_recorded",
  // Variable infra
  "infra.variable_cost_recorded",
] as const;
export type BusinessEventName = (typeof BUSINESS_EVENT_NAMES)[number];

export interface BusinessEventInput {
  /** OBS-002 §2 `component` — which part of the system emitted this (e.g. "webhooks/payments", "routines/pipeline"). */
  readonly component: string;
  /** Only for cost-bearing events (ai.usage_recorded, channel.cost_recorded, infra.variable_cost_recorded) — OBS-BIZ-001 §10's reconciliation states start most local events at observed_unreconciled, carried here in metadata rather than a dedicated column since only a minority of events carry a cost. */
  readonly costBrl?: number;
  readonly eventName: BusinessEventName;
  /** The rest of the OBS-002 envelope relevant to this event (subscriptionId, mutationId, provider, tokens, etc.) — event-shape-specific, so kept as an open metadata bag rather than one column per possible field. */
  readonly metadata?: Record<string, unknown>;
  readonly outcome: "success" | "partial" | "blocked" | "error";
  /** Reuses an existing trace (e.g. the same trace as the AIUsage row this event summarizes). A fresh one is generated when omitted. */
  readonly traceId?: string;
}

/**
 * Persists one OBS-BIZ-001 business event into `TelemetryEvent`
 * (M15-T02). This is a **local, workspace-scoped event log** — real,
 * queryable, RLS-protected — not the "event store/warehouse" OBS-BIZ-001
 * §11 lists as GAP (no cross-account analytics warehouse, no
 * reconciliation job against provider/billing data exists here).
 * `packages/observability/metrics.ts` reads this table (plus
 * Subscription/AIUsage/UsageLedger/ExecutionCredit) to compute
 * OBS-BIZ-001 §6's real formulas.
 */
export const emitBusinessEvent = async (
  workspaceId: string,
  event: BusinessEventInput
): Promise<void> => {
  await forWorkspace(workspaceId).telemetryEvent.create({
    data: {
      workspaceId,
      traceId: event.traceId ?? newTraceId(),
      eventName: event.eventName,
      component: event.component,
      outcome: event.outcome,
      costBrl: event.costBrl,
      metadata: event.metadata as unknown as Prisma.InputJsonValue | undefined,
    },
  });
};
