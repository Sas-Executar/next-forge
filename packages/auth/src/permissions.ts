import type { MembershipRole } from "@repo/database";
import { canTransitionTask } from "@repo/domain";
import type { ActorType, AuthorityDecision } from "@repo/schemas";

/**
 * M16-T01 — the real permission matrix. `SEC-004` (Blueprint, read-only)
 * is an empty one-line stub ("status: draft") with no rows — there is no
 * spec to transcribe here. What follows is code-owned: it documents this
 * codebase's actual, already-implemented authorization behavior (every
 * `requireRole()` call site and both domain AuthorityGate functions,
 * `canTransitionTask`/`evaluateMutationAuthority`), not a new policy
 * invented for this milestone. Each row cites the real file it describes
 * (`source`) and, where the underlying check is pure, a `verify()`
 * closure the regression test below calls directly against the live
 * function — so a row can't silently drift from the code it claims to
 * describe.
 *
 * Columns mirror SEC-004's own header exactly — Actor/Agent | Resource |
 * Action | Allowed | Approval | Scope | Audit event — the one structural
 * artifact that stub actually specifies. `source`/`verify` are this
 * file's own addition beyond that shape, not part of SEC-004.
 */

/**
 * `requireRole()` (../server.ts) has always compared roles by this exact
 * rank table — moved here, not duplicated, so this file's regression
 * test and the real server-side gate share one comparator. `../server.ts`
 * re-exports `hasRole`/`ROLE_RANK` rather than keeping its own copy.
 */
export const ROLE_RANK: Readonly<Record<MembershipRole, number>> = {
  MEMBER: 0,
  OWNER: 1,
};

export const hasRole = (
  actual: MembershipRole,
  required: MembershipRole
): boolean => ROLE_RANK[actual] >= ROLE_RANK[required];

export interface PermissionMatrixRow {
  /** SEC-004 "Action". */
  readonly action: string;
  /** SEC-004 "Actor/Agent". */
  readonly actor: ActorType;
  /** SEC-004 "Allowed". */
  readonly allowed: boolean | "CONDITIONAL";
  /** SEC-004 "Approval" — the AuthorityGate decision, or "N/A" for rows gated by role alone, not the domain AuthorityGate. */
  readonly approval: AuthorityDecision | "N/A";
  /** SEC-004 "Audit event" — the real AuditEvent.action value written, or null where this codebase does not yet audit that action (a real gap, not hidden). */
  readonly auditEvent: string | null;
  /** SEC-004 "Resource". */
  readonly resource: string;
  /** SEC-004 "Scope" — free text; the workspace-scoped RLS boundary applies to every row here (packages/database/rls.ts), so only the narrower gate on top of it is called out. */
  readonly scope: string;
  /** Not a SEC-004 column: the real file/function this row documents. */
  readonly source: string;
  /** Not a SEC-004 column: re-runs the real guard this row describes and reports whether it still matches `allowed`/`approval`. Omitted for rows with no pure function to call (Stripe/Meta/Google OAuth side effects). */
  readonly verify?: () => boolean;
}

export const PERMISSION_MATRIX: readonly PermissionMatrixRow[] = [
  // ---------------------------------------------------------------------
  // Task state machine (packages/domain/src/task-state.ts,
  // canTransitionTask) — the one AuthorityGate baseline SPEC-ROUTINES-001
  // §7 actually specifies (Blueprint, read-only).
  // ---------------------------------------------------------------------
  {
    actor: "USER",
    resource: "Task",
    action: "BACKLOG_VALIDATED → READY",
    allowed: true,
    approval: "ALLOW",
    scope:
      "workspace-scoped; any MEMBER (apps/app/.../complete-action.ts requires requireRole('MEMBER'))",
    auditEvent: "TASK_STATE_TRANSITION",
    source: "packages/domain/src/task-state.ts canTransitionTask",
    verify: () =>
      canTransitionTask("BACKLOG_VALIDATED", "READY", "USER") === "ALLOW",
  },
  {
    actor: "USER",
    resource: "Task",
    action: "READY → DOING / DOING → VERIFY / VERIFY → DONE",
    allowed: true,
    approval: "ALLOW",
    scope:
      "workspace-scoped; any MEMBER — DONE additionally requires an Evidence row (complete-action.ts's own MissingEvidenceError, not the AuthorityGate)",
    auditEvent: "TASK_STATE_TRANSITION",
    source: "packages/domain/src/task-state.ts canTransitionTask",
    verify: () =>
      canTransitionTask("READY", "DOING", "USER") === "ALLOW" &&
      canTransitionTask("DOING", "VERIFY", "USER") === "ALLOW" &&
      canTransitionTask("VERIFY", "DONE", "USER") === "ALLOW",
  },
  {
    actor: "USER",
    resource: "Task",
    action: "any state → BLOCKED",
    allowed: true,
    approval: "ALLOW",
    scope: "workspace-scoped; any MEMBER — a safety valve, never over-promotes",
    auditEvent: "TASK_STATE_TRANSITION",
    source: "packages/domain/src/task-state.ts canTransitionTask",
    verify: () => canTransitionTask("DOING", "BLOCKED", "USER") === "ALLOW",
  },
  {
    actor: "AGENT",
    resource: "Task",
    action: "BACKLOG_VALIDATED → READY",
    allowed: true,
    approval: "ALLOW",
    scope: "workspace-scoped; the one promotion an agent may make unattended",
    auditEvent:
      "mcp:<toolName> (packages/mcp/src/context.ts auditMcpToolCall) when reached via MCP",
    source: "packages/domain/src/task-state.ts canTransitionTask",
    verify: () =>
      canTransitionTask("BACKLOG_VALIDATED", "READY", "AGENT") === "ALLOW",
  },
  {
    actor: "AGENT",
    resource: "Task",
    action: "READY → DOING / DOING → VERIFY / VERIFY → DONE",
    allowed: "CONDITIONAL",
    approval: "HUMAN_REQUIRED",
    scope:
      "workspace-scoped; structurally legal but never auto-applied — a human must confirm",
    auditEvent: null,
    source: "packages/domain/src/task-state.ts canTransitionTask",
    verify: () =>
      canTransitionTask("READY", "DOING", "AGENT") === "HUMAN_REQUIRED" &&
      canTransitionTask("DOING", "VERIFY", "AGENT") === "HUMAN_REQUIRED" &&
      canTransitionTask("VERIFY", "DONE", "AGENT") === "HUMAN_REQUIRED",
  },
  {
    actor: "AGENT",
    resource: "Task",
    action: "an illegal transition (e.g. BACKLOG_VALIDATED → DONE)",
    allowed: false,
    approval: "BLOCK",
    scope: "workspace-scoped",
    auditEvent: null,
    source: "packages/schemas/src/task-state.ts TASK_STATE_TRANSITIONS",
    verify: () =>
      canTransitionTask("BACKLOG_VALIDATED", "DONE", "AGENT") === "BLOCK",
  },

  // ---------------------------------------------------------------------
  // Routine mutation authority (packages/routines/src/authority-gate.ts,
  // evaluateMutationAuthority) — reuses canTransitionTask with a fixed
  // actor="AGENT" for task_transition, plus its own sync_mirror
  // always-allow rule. Not imported here: @repo/routines' package entry
  // point (index.ts) pulls in pipeline.ts, which imports
  // forWorkspace()/@repo/database — the same eager DATABASE_URL
  // validation that forced the entitlements/ai-cost/metrics pure-impure
  // splits elsewhere in this repo (M13/M15). @repo/auth is a
  // foundational package nearly every app depends on; taking on that
  // whole subtree just to re-check one trivial branch isn't worth it.
  // The sync_mirror row is cited by file/line instead of re-run; the
  // task_transition row re-runs canTransitionTask directly — the exact
  // function evaluateMutationAuthority delegates to for that case, per
  // its own source (packages/routines/src/authority-gate.ts:28).
  // ---------------------------------------------------------------------
  {
    actor: "SYSTEM",
    resource: "Routine",
    action: "sync_mirror (mirroring an external source's state)",
    allowed: true,
    approval: "ALLOW",
    scope:
      "workspace-scoped; scheduler-triggered (apps/api/app/cron/routines) or manual (runRoutineNow)",
    auditEvent: "routine.* (packages/routines/src/events.ts, actorType SYSTEM)",
    source:
      "packages/routines/src/authority-gate.ts:26 evaluateMutationAuthority — unconditional ALLOW, no pure sub-call to re-run here (see comment above)",
  },
  {
    actor: "AGENT",
    resource: "Routine",
    action:
      "task_transition (any Routine-driven Task state change beyond READY)",
    allowed: "CONDITIONAL",
    approval: "HUMAN_REQUIRED",
    scope:
      "workspace-scoped; a Routine can never silently push a Task past READY",
    auditEvent: null,
    source:
      'packages/routines/src/authority-gate.ts:28 evaluateMutationAuthority — delegates to canTransitionTask(from, to, "AGENT")',
    verify: () =>
      canTransitionTask("READY", "DOING", "AGENT") === "HUMAN_REQUIRED",
  },

  // ---------------------------------------------------------------------
  // MCP (packages/mcp) — every tool call runs as actorType AGENT
  // regardless of which human/agent platform is driving it, gated by the
  // same requireRole('MEMBER') at the transport layer
  // (apps/api/app/mcp/route.ts) before any tool handler ever runs.
  // ---------------------------------------------------------------------
  {
    actor: "AGENT",
    resource: "MCP tool call (any tool in packages/mcp/src/tools)",
    action: "invoke",
    allowed: true,
    approval: "N/A",
    scope:
      "workspace-scoped; the calling Clerk session must hold MEMBER in this workspace",
    auditEvent: "mcp:<toolName> (packages/mcp/src/context.ts auditMcpToolCall)",
    source: "apps/api/app/mcp/route.ts requireRole('MEMBER')",
  },

  // ---------------------------------------------------------------------
  // Role-gated app actions (requireRole() call sites, packages/auth's
  // provisional 2-role model — MembershipRole in schema.prisma). Every
  // row's `verify` re-runs the exact comparator requireRole() itself
  // uses (hasRole, above), against the two roles that actually exist.
  // ---------------------------------------------------------------------
  {
    actor: "USER",
    resource: "Billing (Stripe checkout / customer portal)",
    action: "startCheckout / openBillingPortal",
    allowed: true,
    approval: "N/A",
    scope: "workspace-scoped; OWNER only",
    auditEvent: null,
    source: "apps/app/app/actions/billing/checkout.ts requireRole('OWNER')",
    verify: () => hasRole("OWNER", "OWNER") && !hasRole("MEMBER", "OWNER"),
  },
  {
    actor: "USER",
    resource:
      "Integrations (WhatsApp connect, Gmail/Outlook OAuth connect, disconnect)",
    action: "connect / disconnect",
    allowed: true,
    approval: "N/A",
    scope: "workspace-scoped; OWNER only",
    auditEvent: null,
    source:
      "apps/app/app/actions/integrations/{connect-whatsapp,disconnect}.ts, apps/app/app/api/integrations/{gmail,outlook}/connect/route.ts — all requireRole('OWNER')",
    verify: () => hasRole("OWNER", "OWNER") && !hasRole("MEMBER", "OWNER"),
  },
  {
    actor: "USER",
    resource: "Admin economic dashboard (/admin/dashboard)",
    action: "view",
    allowed: true,
    approval: "N/A",
    scope:
      "single workspace's own MRR/ARR/AI COGS — OWNER only, not a platform-wide operator console (no such role exists)",
    auditEvent: null,
    source:
      "apps/app/app/(authenticated)/admin/dashboard/page.tsx requireRole('OWNER')",
    verify: () => hasRole("OWNER", "OWNER") && !hasRole("MEMBER", "OWNER"),
  },
  {
    actor: "USER",
    resource:
      "Execution (create project/task/deliverable, complete action), Scanner (dispatch/undo/symbols), Reports (generate), Mapa-OS (print), Routines (run now), Automation (run workflow), Copilot (chat)",
    action: "create / mutate / generate / run",
    allowed: true,
    approval: "N/A",
    scope:
      "workspace-scoped; any MEMBER (or OWNER, which satisfies a MEMBER requirement)",
    auditEvent:
      "varies by action — see each action's own AuditEvent.action value",
    source:
      "apps/app/app/actions/execution/*.ts, apps/api/app/scanner/*/route.ts, apps/app/app/actions/{reports,routines,automation}/*.ts, apps/app/app/api/{mapa-os/print,chat}/route.ts — all requireRole('MEMBER')",
    verify: () => hasRole("MEMBER", "MEMBER") && hasRole("OWNER", "MEMBER"),
  },
];
