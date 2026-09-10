import "server-only";

import { forWorkspace } from "@repo/database";
import { estimateCostUsd } from "./ai-pricing";
import { emitBusinessEvent } from "./business-events";
import { newTraceId } from "./trace";

export { estimateCostUsd } from "./ai-pricing";

export interface RecordAiUsageInput {
  readonly agentRunId?: string;
  readonly cachedInputTokens?: number;
  readonly capabilityId?: string;
  /**
   * BRL/USD rate for this call. No live FX source exists in this
   * codebase (OBS-PLAN-001's own dependency list names "regime
   * tributário e fonte de tax provision" and implicitly an FX source as
   * pending infrastructure) — when omitted, `costBrl` stays `null`
   * rather than computed from a fabricated rate; `providerCostNative`/
   * `nativeCurrency` (USD) are still recorded either way.
   */
  readonly fxRateBrl?: number;
  readonly inputTokens: number;
  readonly model: string;
  readonly outcome?: "success" | "partial" | "blocked" | "error";
  readonly outputTokens: number;
  readonly provider?: string;
  readonly traceId?: string;
}

/**
 * OBS-006 (Blueprint, read-only, `docs/13-observability/
 * AI_COST_BUDGET.md`) §3's "campos obrigatórios por chamada" — a real
 * per-call cost record, not a meter/enforcement runtime (OBS-006 §9
 * explicitly lists "meter real" and "enforcement runtime" as not yet
 * existing — this is the former, a real accounting record of a call
 * that already happened, not a budget gate that blocks one).
 *
 * M15-T03 — writes one real `AIUsage` row per model call and emits the
 * matching `ai.usage_recorded` business event (OBS-BIZ-001 §4, exact
 * required field list). Called from the one real model-call site this
 * repo has today: apps/app's `/api/chat` route (M06's Copilot), via
 * `streamText`'s own `onFinish` callback — see that route's own comment
 * for why this is the only wired call site.
 */
export const recordAiUsage = async (
  workspaceId: string,
  input: RecordAiUsageInput
): Promise<void> => {
  const provider = input.provider ?? "openai";
  const costUsd = estimateCostUsd(
    input.model,
    input.inputTokens,
    input.outputTokens
  );
  const costBrl =
    costUsd !== null && input.fxRateBrl !== undefined
      ? costUsd * input.fxRateBrl
      : null;
  const traceId = input.traceId ?? newTraceId();

  const db = forWorkspace(workspaceId);
  await db.aIUsage.create({
    data: {
      workspaceId,
      agentRunId: input.agentRunId,
      traceId,
      provider,
      model: input.model,
      capabilityId: input.capabilityId,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cachedInputTokens: input.cachedInputTokens,
      providerCostNative: costUsd,
      nativeCurrency: costUsd === null ? null : "USD",
      fxRateBrl: input.fxRateBrl,
      costBrl,
      outcome: input.outcome ?? "success",
    },
  });

  await emitBusinessEvent(workspaceId, {
    eventName: "ai.usage_recorded",
    component: "observability/ai-cost",
    outcome: input.outcome ?? "success",
    costBrl: costBrl ?? undefined,
    traceId,
    metadata: {
      provider,
      model: input.model,
      capabilityId: input.capabilityId,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cachedInputTokens: input.cachedInputTokens,
      providerCostNative: costUsd,
      nativeCurrency: costUsd === null ? null : "USD",
      fxRateBrl: input.fxRateBrl,
    },
  });
};
