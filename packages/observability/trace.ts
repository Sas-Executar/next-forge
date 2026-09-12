import { z } from "zod";

/**
 * OBS-002 (Blueprint, read-only, `docs/13-observability/TRACE_SCHEMA.md`)
 * — "o envelope mínimo de correlação para request, agent run, tool/model
 * calls, rotinas, canais, mutações e custos." Field names and nullability
 * below are verbatim from that spec's §2-§6, not paraphrased or
 * invented. Deliberately pure (no `@repo/database`, no `server-only`) —
 * the envelope itself is just data; `business-events.ts`/`ai-cost.ts`
 * are the DB-backed modules that actually persist events built from it.
 *
 * OBS-002 §9 (verbatim GAP, not resolved by this milestone):
 * "Persistência, sampling, retention, schema registry e backend de
 * tracing ainda não estão implementados." This module implements the
 * envelope shape and a minimal local persistence (TelemetryEvent/
 * AIUsage, M15) — not a schema registry, not a sampling policy, not a
 * dedicated tracing backend (Sentry/Datadog/etc.).
 */

/** OBS-002 §2 — the common envelope every event carries. */
export const traceEnvelopeSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().nullable().default(null),
  requestId: z.string().nullable().default(null),
  sessionId: z.string().nullable().default(null),
  accountId: z.string().nullable().default(null),
  workspaceId: z.string().nullable().default(null),
  userId: z.string().nullable().default(null),
  planId: z.string().nullable().default(null),
  occurredAt: z.string().datetime(),
  component: z.string(),
  eventName: z.string(),
  outcome: z.enum(["success", "partial", "blocked", "error"]),
  errorClass: z.string().nullable().default(null),
  latencyMs: z.number().nullable().default(null),
});
export type TraceEnvelope = z.infer<typeof traceEnvelopeSchema>;

/** OBS-002 §3 — agent/tool/model span fields, additive to the common envelope. */
export const agentSpanSchema = z.object({
  agentRunId: z.string().nullable().default(null),
  toolCallId: z.string().nullable().default(null),
  routineRunId: z.string().nullable().default(null),
  capabilityId: z.string().nullable().default(null),
  provider: z.string().nullable().default(null),
  model: z.string().nullable().default(null),
  inputTokens: z.number().nullable().default(null),
  outputTokens: z.number().nullable().default(null),
  cachedInputTokens: z.number().nullable().default(null),
  providerCostNative: z.number().nullable().default(null),
  nativeCurrency: z.string().nullable().default(null),
  fxRateBrl: z.number().nullable().default(null),
  costBrl: z.number().nullable().default(null),
});
export type AgentSpan = z.infer<typeof agentSpanSchema>;

/** OBS-002 §4 — channel (delivery) span fields. */
export const channelSpanSchema = z.object({
  deliveryId: z.string().nullable().default(null),
  channel: z
    .enum(["APP_REPORTS", "EMAIL", "WHATSAPP", "MCP", "COPILOT", "SCANNER"])
    .nullable()
    .default(null),
  provider: z.string().nullable().default(null),
  messageCategory: z.string().nullable().default(null),
  providerCostNative: z.number().nullable().default(null),
  costBrl: z.number().nullable().default(null),
  deliveryStatus: z.string().nullable().default(null),
});
export type ChannelSpan = z.infer<typeof channelSpanSchema>;

/** OBS-002 §5 — domain-mutation correlation. "A telemetria referencia o resultado canônico do domínio; não o cria." */
export const domainCorrelationSchema = z.object({
  mutationId: z.string().nullable().default(null),
  objectType: z.string().nullable().default(null),
  objectId: z.string().nullable().default(null),
  previousState: z.string().nullable().default(null),
  newState: z.string().nullable().default(null),
  evidenceId: z.string().nullable().default(null),
});
export type DomainCorrelation = z.infer<typeof domainCorrelationSchema>;

/** OBS-002 §6 — billing/economic correlation. */
export const billingCorrelationSchema = z.object({
  subscriptionId: z.string().nullable().default(null),
  invoiceId: z.string().nullable().default(null),
  billingInterval: z.enum(["monthly", "annual"]).nullable().default(null),
  recognizedRevenueBrl: z.number().nullable().default(null),
  paymentFeeBrl: z.number().nullable().default(null),
  taxProvisionBrl: z.number().nullable().default(null),
  reconciliationState: z
    .enum([
      "proposed",
      "observed_unreconciled",
      "observed_reconciled",
      "derived_observed",
    ])
    .nullable()
    .default(null),
});
export type BillingCorrelation = z.infer<typeof billingCorrelationSchema>;

/**
 * A fresh trace/span id pair. Not a distributed-tracing context
 * propagation system (no AsyncLocalStorage, no header propagation
 * across service boundaries) — callers thread `traceId` through
 * explicit function parameters, the same way `workspaceId` already
 * flows through this codebase's own call chains. A real propagation
 * layer is part of OBS-002 §9's own disclosed GAP ("backend de tracing
 * ainda não está implementado"), not something this milestone invents.
 */
export const newTraceId = (): string => crypto.randomUUID();
export const newSpanId = (): string => crypto.randomUUID();
