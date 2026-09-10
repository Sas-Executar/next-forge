import type { SubscriptionPlan } from "@repo/schemas";

/**
 * PRICING-001 §2's own recommended structure (Blueprint, read-only),
 * verbatim — fetched directly from the Blueprint repo
 * (docs/17-business/PRICING.md), not worked from the plan document's
 * paraphrase (same discipline M09/M12 established). The doc's own
 * header is explicit and load-bearing: "Os valores abaixo são preços de
 * teste PROPOSED. pre_approved significa que a arquitetura de cobrança
 * está autorizada para experimentação e modelagem; não significa preço
 * publicado, contrato comercial ativo ou release." Every price here
 * carries that same status — this module fixes the *structure* Stripe
 * needs to exist, not a claim that these are final, approved prices.
 *
 * Amounts are integer BRL centavos (Stripe's own unit for a zero-
 * decimal-safe currency amount) — PRICING-001 gives decimal reais
 * (R$49,90), converted here once rather than repeated at each call site.
 */
export interface PlanDefinition {
  readonly annualPriceCentavos: number | null;
  /** null = no self-serve price exists (Trial has no charge; Enterprise is "custom", i.e. sold outside Stripe Checkout). */
  readonly monthlyPriceCentavos: number | null;
  readonly name: string;
  readonly plan: SubscriptionPlan;
  readonly unit: string;
}

export const PLAN_DEFINITIONS: Readonly<
  Record<SubscriptionPlan, PlanDefinition>
> = {
  TRIAL: {
    plan: "TRIAL",
    name: "Trial",
    monthlyPriceCentavos: null,
    annualPriceCentavos: null,
    unit: "14 dias",
  },
  SOLO: {
    plan: "SOLO",
    name: "Solo",
    monthlyPriceCentavos: 4990,
    annualPriceCentavos: 49_900,
    unit: "1 executor",
  },
  PRO: {
    plan: "PRO",
    name: "Pro",
    monthlyPriceCentavos: 8990,
    annualPriceCentavos: 91_900,
    unit: "1 executor",
  },
  BUSINESS: {
    plan: "BUSINESS",
    name: "Business",
    monthlyPriceCentavos: 49_900,
    annualPriceCentavos: 539_000,
    unit: "workspace, 5 seats incluídos",
  },
  ENTERPRISE: {
    plan: "ENTERPRISE",
    name: "Enterprise",
    // "custom" — PRICING-001 §2: no self-serve Stripe price exists;
    // Enterprise is sold outside Checkout (contract), never fabricated
    // as a number here.
    monthlyPriceCentavos: null,
    annualPriceCentavos: null,
    unit: "contrato",
  },
};

/** PRICING-001 §5: Business seat pricing beyond the 5 included — PROPOSED, same status as every other figure here. */
export const BUSINESS_ADDITIONAL_SEAT_PRICE_CENTAVOS = 8900;

/** Self-serve plans are the ones a Stripe Checkout session can actually be created for (Enterprise is contract-only). */
export const SELF_SERVE_PLANS: readonly SubscriptionPlan[] = [
  "SOLO",
  "PRO",
  "BUSINESS",
];
