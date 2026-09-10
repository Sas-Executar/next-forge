import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { keys } from "./keys";

/**
 * 3-tier model router (ADR-STACK-001 decision D4).
 *
 * The corpus bans "chamadas espalhadas pelo código" for AI usage
 * (Blueprint, read-only: OBJETIVOS E OUTPUT REQUIREMNETS.md §6) — one
 * router, not per-feature model choices. Tier mapping mirrors the
 * corpus's own cost tiers (Financeiro.md: "ação simples → cheap /
 * estruturação·análise média → mid / decisão·replanejamento complexo →
 * high").
 *
 * Provisional (plan §8, D4): single-provider, 3 fixed model IDs. Revisit
 * once real usage/cost data exists — this is a starting point, not a
 * final decision.
 */
const openai = createOpenAI({ apiKey: keys().OPENAI_API_KEY });

export const models: {
  cheap: LanguageModel;
  mid: LanguageModel;
  high: LanguageModel;
} = {
  cheap: openai("gpt-4o-mini"),
  mid: openai("gpt-4o"),
  high: openai("o1"),
};

export type ModelComplexity = "simple" | "structuring" | "complex";

export const routeModel = (complexity: ModelComplexity): LanguageModel => {
  switch (complexity) {
    case "simple":
      return models.cheap;
    case "structuring":
      return models.mid;
    case "complex":
      return models.high;
    default: {
      const exhaustive: never = complexity;
      throw new Error(`Unhandled model complexity: ${exhaustive as string}`);
    }
  }
};
