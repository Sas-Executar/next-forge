import { z } from "zod";

/**
 * AuthorityGate decision (D9). Distinct from `BehaviorAuthority`
 * (authority.ts): that classifies a capability's determinism in the
 * abstract; this classifies the outcome of one specific mutation
 * attempt.
 *
 * Source: SPEC-ROUTINES-001 §7 (Blueprint, read-only) — "decisão
 * ALLOW|BLOCK|HUMAN_REQUIRED". Baseline used throughout: auto-allow
 * `sync_mirror` and `BACKLOG_VALIDATED → READY`; `DOING`/`VERIFY`/`DONE`
 * are HUMAN_REQUIRED.
 */
export const authorityDecisionSchema = z.enum(["ALLOW", "BLOCK", "HUMAN_REQUIRED"]);

export type AuthorityDecision = z.infer<typeof authorityDecisionSchema>;
