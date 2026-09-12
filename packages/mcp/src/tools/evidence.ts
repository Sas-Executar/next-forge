import "server-only";

import { forWorkspace } from "@repo/database";
import type { EvidenceGrade } from "@repo/schemas";
import { auditMcpToolCall, type McpToolContext } from "../context";
import { TaskNotFoundError } from "./tasks";

/**
 * `evidence.create` (M12-T02) — attaches an Evidence row to a task
 * without necessarily transitioning its state (unlike `tasks.update`'s
 * evidence param, which is paired with a DONE transition). Useful for an
 * MCP client recording intermediate proof (a screenshot, a link) ahead
 * of a human confirming completion separately.
 */
export const evidenceCreate = async (
  ctx: McpToolContext,
  input: {
    readonly taskId: string;
    readonly description: string;
    readonly grade: EvidenceGrade;
    readonly url?: string;
  }
) => {
  const db = forWorkspace(ctx.workspaceId);
  const task = await db.task.findUnique({ where: { id: input.taskId } });
  if (!task) {
    throw new TaskNotFoundError(input.taskId);
  }

  const evidence = await db.evidence.create({
    data: {
      workspaceId: ctx.workspaceId,
      taskId: input.taskId,
      grade: input.grade,
      description: input.description,
      url: input.url,
    },
  });

  await auditMcpToolCall(ctx, {
    toolName: "evidence.create",
    action: "CREATE",
    objectType: "Evidence",
    objectId: evidence.id,
    metadata: { taskId: input.taskId },
  });

  return evidence;
};
