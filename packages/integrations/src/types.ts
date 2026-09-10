import type { IntegrationProvider } from "@repo/database";

/**
 * One inbound event normalized off any provider's webhook payload,
 * before it becomes an ExternalObjectRef row (PRD-OMNI-001,
 * REQ-OMNI-001: every external object maps to exactly one canonical
 * row). `externalObjectType` is provider-specific ("whatsapp_message",
 * "gmail_message", "outlook_message") — the mapping to a canonical
 * domain object (Task, Deliverable, ...) is deliberately NOT decided
 * here: no inbound-message-to-Task rule exists anywhere in the
 * Blueprint (SPEC-SCANNER-001's dispatcher is the only real "external
 * signal mutates domain state" contract this repo has, and it's a
 * different mechanism entirely — vision-based, not channel-based). So
 * normalization today records the raw external object and lets a human
 * or a later routine (M10) decide what, if anything, it maps to —
 * never inventing a Task/Deliverable on the integration's own
 * authority.
 */
export interface NormalizedInboundEvent {
  readonly externalId: string;
  readonly externalObjectType: string;
  readonly payload: Record<string, unknown>;
  readonly receivedAt: string;
}

export interface OAuthTokenSet {
  readonly accessToken: string;
  readonly expiresAt: Date | null;
  readonly refreshToken: string | null;
}

export interface FreeBusyWindow {
  readonly end: string;
  readonly start: string;
}

/**
 * Calendar adapters (M11-T04) return capacity information only — a list
 * of busy windows. Nothing in this package ever converts a busy window
 * into a task/deliverable mutation: "calendário influencia capacidade,
 * não promove progresso" (plan §4, M11-T04) is enforced by omission —
 * there is no function here that writes domain state from a calendar
 * read.
 */
export interface FreeBusyResult {
  readonly busy: readonly FreeBusyWindow[];
  readonly provider: IntegrationProvider;
}
