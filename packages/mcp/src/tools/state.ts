import "server-only";

import type { OrchestratorOutput } from "@repo/agent-runtime";
import { runEstado } from "@repo/agent-runtime";
import type { McpToolContext } from "../context";

/**
 * `state.get` (M12-T02) — the exact same `runEstado()` (packages/
 * agent-runtime, M06) the Copiloto's `/estado` command calls: derived
 * progress, WIP, blocked tasks, sprint window. Read-only, so no audit
 * event — AuditEvent (packages/database schema.prisma) exists to trace
 * mutations, not reads.
 */
export const stateGet = (ctx: McpToolContext): Promise<OrchestratorOutput> =>
  runEstado(ctx.workspaceId);
