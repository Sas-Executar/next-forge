import "server-only";

import { buildStatusReport, type StatusReport } from "@repo/reports";
import type { McpToolContext } from "../context";

/**
 * `reports.generate` (M12-T02) — the exact same `buildStatusReport()`
 * (packages/reports, M07) `/reports` reads. Read-only (StatusReport rows
 * aren't persisted by this call — buildStatusReport computes on read,
 * same as /reports' own page), so no AuditEvent beyond the generic
 * per-call one the MCP server wrapper logs for every tool invocation.
 */
export const reportsGenerate = (
  ctx: McpToolContext,
  input: { readonly projectId?: string }
): Promise<StatusReport> => buildStatusReport(ctx.workspaceId, input.projectId);
