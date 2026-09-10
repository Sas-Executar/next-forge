import "server-only";

import { forWorkspace } from "@repo/database";
import { auditMcpToolCall, type McpToolContext } from "../context";

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project ${projectId} not found in this workspace.`);
    this.name = "ProjectNotFoundError";
  }
}

/** `projects.list` (M12-T02) — every Project in the caller's workspace. RLS (forWorkspace) is the only tenant boundary; MCP adds no second one. */
export const projectsList = (ctx: McpToolContext) =>
  forWorkspace(ctx.workspaceId).project.findMany({
    orderBy: { createdAt: "desc" },
  });

/** `projects.get` (M12-T02). */
export const projectsGet = async (
  ctx: McpToolContext,
  input: { readonly projectId: string }
) => {
  const project = await forWorkspace(ctx.workspaceId).project.findUnique({
    where: { id: input.projectId },
  });
  if (!project) {
    throw new ProjectNotFoundError(input.projectId);
  }
  return project;
};

/**
 * `projects.create` (M12-T02) — same write as
 * apps/app/app/actions/execution/create-project.ts's server action, not
 * a second implementation with different rules: create the row through
 * the RLS-scoped client, then log the AuditEvent (M12-T03). apps/app's
 * "use server" action isn't importable here (a Server Action is bundled
 * into its own Next.js app, not a reusable cross-app function), so this
 * duplicates its handful of lines rather than reach across app
 * boundaries — the same reasoning packages/scanner's dispatch.ts and
 * packages/routines' pipeline.ts already apply for their own writes.
 */
export const projectsCreate = async (
  ctx: McpToolContext,
  input: { readonly name: string; readonly description?: string }
) => {
  const db = forWorkspace(ctx.workspaceId);
  const project = await db.project.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: input.name,
      description: input.description,
    },
  });
  await auditMcpToolCall(ctx, {
    toolName: "projects.create",
    action: "CREATE",
    objectType: "Project",
    objectId: project.id,
  });
  return project;
};
