import type { SubscriptionPlan } from "@repo/schemas";

/**
 * Capability/quota table (M13-T02), read directly from PRICING-001 §3-5
 * (Blueprint, read-only, fetched verbatim from
 * `docs/17-business/PRICING.md`) — not `if plan === 'pro'` scattered
 * across feature code (plan §4 M13-T02's own stated goal). Every
 * boolean below traces to a specific line in that doc; nothing here is
 * invented past what it actually says.
 *
 * Two fields are deliberately qualitative, not numeric:
 * `aiCreditsTier` and `whatsappIncluded` — PRICING-001 says "franquia
 * básica de IA" (Solo) vs "maior franquia de IA" (Pro) and "franquia
 * incluída no Pro/Business quando o canal estiver implementado" for
 * WhatsApp, but never gives an actual number of Execution Credits or
 * messages. Fabricating a specific allowance here would misrepresent an
 * intentionally-unset business decision as a settled one — see
 * credits.ts's own comment on the same gap for the ledger side.
 *
 * Deliberately pure (no `@repo/database` import, no `server-only`) —
 * the table itself is static data with no I/O, same reasoning
 * packages/mcp/src/tools/tasks.ts's canTransitionTask reuse and D9's
 * TaskState mirroring already apply: safe to import from anywhere,
 * including a future mobile app. The DB-backed lookup
 * (`getWorkspaceEntitlements`, resolving a real workspace's current
 * plan) lives in workspace-entitlements.ts instead, so importing that
 * one function doesn't force every consumer of this pure table through
 * `DATABASE_URL` validation.
 */
export interface PlanEntitlements {
  /** PRICING-001 §4: "Reports avançados". */
  readonly advancedReports: boolean;
  readonly aiCreditsTier: "basic" | "expanded" | "contract";
  /** PRICING-001 §4: automações. */
  readonly automations: boolean;
  /** projetos/tarefas/ações, WIP 1:1/Lista/Kanban, Agora/Hoje/Amanhã, Copiloto, Status Report, Mapa-OS, Scanner — PRICING-001 §3: "não devem ser escondidos no plano mais caro, porque compõem o produto central." True on every plan, Trial included. */
  readonly coreExecutionSurface: boolean;
  /** PRICING-001 §4/§7: Email/WhatsApp channels, gated by franchise once the channel is implemented (M11). */
  readonly emailChannel: boolean;
  /** PRICING-001 §4: "MCP quando implementado e autorizado" — implemented as of M12; this flag is the "autorizado" half. */
  readonly mcp: boolean;
  /** PRICING-001 §5: governança, permissões, auditoria, workflows compartilhados, controles organizacionais — Business+ only, and only "quando implementados" (M16's permission matrix is still a stub today — this flag names the plan gate, not a claim that the feature itself exists yet). */
  readonly organizationalGovernance: boolean;
  readonly plan: SubscriptionPlan;
  /** PRICING-001 §4: Remix multi-project scope mode. */
  readonly remixMultiProject: boolean;
  /** PRICING-001 §4: Rotinas. */
  readonly routines: boolean;
  /** PRICING-001 §4: "personalização de símbolos/ações do Scanner conforme policy". */
  readonly scannerSymbolCustomization: boolean;
  /** PRICING-001 §2/§5: seats included before BUSINESS_ADDITIONAL_SEAT_PRICE_CENTAVOS applies. null for Enterprise — "contrato", not a fixed number this repo can state. */
  readonly seatsIncluded: number | null;
  readonly whatsappChannel: boolean;
  /** PRICING-001 §4: workflows (packages/automation, M10). */
  readonly workflows: boolean;
}

const nonBusinessSeats = 1; // "1 executor" (PRICING-001 §2) for Trial/Solo/Pro.

export const PLAN_ENTITLEMENTS: Readonly<
  Record<SubscriptionPlan, PlanEntitlements>
> = {
  TRIAL: {
    plan: "TRIAL",
    coreExecutionSurface: true,
    routines: false,
    automations: false,
    remixMultiProject: false,
    mcp: false,
    workflows: false,
    advancedReports: false,
    scannerSymbolCustomization: false,
    emailChannel: false,
    whatsappChannel: false,
    organizationalGovernance: false,
    seatsIncluded: nonBusinessSeats,
    aiCreditsTier: "basic",
  },
  SOLO: {
    plan: "SOLO",
    coreExecutionSurface: true,
    routines: false,
    automations: false,
    remixMultiProject: false,
    mcp: false,
    workflows: false,
    advancedReports: false,
    scannerSymbolCustomization: false,
    emailChannel: false,
    whatsappChannel: false,
    organizationalGovernance: false,
    seatsIncluded: nonBusinessSeats,
    aiCreditsTier: "basic",
  },
  PRO: {
    plan: "PRO",
    coreExecutionSurface: true,
    routines: true,
    automations: true,
    remixMultiProject: true,
    mcp: true,
    workflows: true,
    advancedReports: true,
    scannerSymbolCustomization: true,
    emailChannel: true,
    whatsappChannel: true,
    organizationalGovernance: false,
    seatsIncluded: nonBusinessSeats,
    aiCreditsTier: "expanded",
  },
  BUSINESS: {
    plan: "BUSINESS",
    coreExecutionSurface: true,
    routines: true,
    automations: true,
    remixMultiProject: true,
    mcp: true,
    workflows: true,
    advancedReports: true,
    scannerSymbolCustomization: true,
    emailChannel: true,
    whatsappChannel: true,
    organizationalGovernance: true,
    seatsIncluded: 5,
    aiCreditsTier: "expanded",
  },
  ENTERPRISE: {
    plan: "ENTERPRISE",
    coreExecutionSurface: true,
    routines: true,
    automations: true,
    remixMultiProject: true,
    mcp: true,
    workflows: true,
    advancedReports: true,
    scannerSymbolCustomization: true,
    emailChannel: true,
    whatsappChannel: true,
    organizationalGovernance: true,
    seatsIncluded: null,
    aiCreditsTier: "contract",
  },
};

export const entitlementsForPlan = (plan: SubscriptionPlan): PlanEntitlements =>
  PLAN_ENTITLEMENTS[plan];

export const hasEntitlement = (
  plan: SubscriptionPlan,
  capability: keyof Omit<
    PlanEntitlements,
    "plan" | "seatsIncluded" | "aiCreditsTier"
  >
): boolean => PLAN_ENTITLEMENTS[plan][capability];
