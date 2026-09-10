import "server-only";

import { forWorkspace, type Prisma } from "@repo/database";

/**
 * Per-request context every MCP tool handler receives (M12-T01/T03).
 * Resolved once in apps/api/app/mcp/route.ts from the caller's Clerk
 * session — via the exact same `requireRole()` (@repo/auth/server) every
 * other apps/api route already uses (packages/scanner's routes,
 * /notifications/register-device) — then threaded into every tool
 * closure `buildMcpServer()` creates. No tool resolves its own tenant:
 * MCP is workspace-scoped by construction, not by convention (D6).
 */
export interface McpToolContext {
  /** Clerk user id of the authenticated caller — recorded on every AuditEvent this session's tool calls produce. */
  readonly actorRef: string;
  readonly workspaceId: string;
}

/**
 * Tenant propagation + audit (M12-T03): every MCP tool call that mutates
 * domain state logs a real AuditEvent, through the same RLS-scoped
 * `forWorkspace()` client every other write path in this repo uses — MCP
 * gets no bypass.
 *
 * `actorType: "AGENT"` (not "USER"): an MCP call is definitionally a
 * request from an external AI agent/platform acting through the tool
 * surface (ADR-OMNICHANNEL-001: "MCP expõe capabilities; não substitui
 * domínio nem authority policy"), even though the *decision* to allow
 * the underlying mutation was made by the same USER-actor domain guard
 * (`canTransitionTask`, `evaluateEligibility`) the web app calls. Per
 * schema.prisma's own comment, an AGENT-actor AuditEvent should carry
 * `authorityRuleId` naming what authorized it — this repo has no
 * separate MCP-specific authority-rule registry, so `authorityRuleId` is
 * set to `mcp:<toolName>`, a disclosed, traceable stand-in that at least
 * names which tool call produced the mutation, not a real rule-engine
 * lookup.
 */
export const auditMcpToolCall = async (
  ctx: McpToolContext,
  event: {
    readonly toolName: string;
    readonly action: string;
    readonly objectType: string;
    readonly objectId: string | null;
    readonly metadata?: Record<string, unknown>;
  }
): Promise<void> => {
  const db = forWorkspace(ctx.workspaceId);
  await db.auditEvent.create({
    data: {
      workspaceId: ctx.workspaceId,
      actorType: "AGENT",
      actorRef: ctx.actorRef,
      action: event.action,
      objectType: event.objectType,
      objectId: event.objectId,
      authorityRuleId: `mcp:${event.toolName}`,
      // Same cast packages/routines/src/events.ts uses for the same
      // reason: a generic Record<string, unknown> parameter isn't
      // structurally assignable to Prisma's InputJsonValue.
      metadata: event.metadata as unknown as Prisma.InputJsonValue | undefined,
    },
  });
};
