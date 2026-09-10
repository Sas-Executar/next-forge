import "server-only";

import { forWorkspace } from "@repo/database";
import { canTransitionTask } from "@repo/domain";
import type { EvidenceGrade, TaskState } from "@repo/schemas";
import { auditMcpToolCall, type McpToolContext } from "../context";

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task ${taskId} not found in this workspace.`);
    this.name = "TaskNotFoundError";
  }
}

/** `tasks.list` (M12-T02) — optionally scoped to one project. */
export const tasksList = (
  ctx: McpToolContext,
  input: { readonly projectId?: string }
) =>
  forWorkspace(ctx.workspaceId).task.findMany({
    where: input.projectId ? { projectId: input.projectId } : {},
    orderBy: { updatedAt: "desc" },
  });

/** `tasks.get` (M12-T02). */
export const tasksGet = async (
  ctx: McpToolContext,
  input: { readonly taskId: string }
) => {
  const task = await forWorkspace(ctx.workspaceId).task.findUnique({
    where: { id: input.taskId },
  });
  if (!task) {
    throw new TaskNotFoundError(input.taskId);
  }
  return task;
};

/**
 * `tasks.create` (M12-T02) — mirrors
 * apps/app/app/actions/execution/create-task.ts: a manually-created task
 * still goes through the real guard (BACKLOG_VALIDATED → READY), just
 * with `actor: "AGENT"` instead of `"USER"` (see tasks-update's own
 * comment on why that matters) — READY is the one promotion
 * canTransitionTask auto-allows an AGENT actor, so this always succeeds
 * for a normal creation; the guard is still exercised for real, not
 * hardcoded past.
 */
export const tasksCreate = async (
  ctx: McpToolContext,
  input: {
    readonly projectId?: string;
    readonly title: string;
    readonly description?: string;
  }
) => {
  const decision = canTransitionTask("BACKLOG_VALIDATED", "READY", "AGENT");
  if (decision !== "ALLOW") {
    throw new Error(
      `Task creation was not authorized (AuthorityGate: ${decision}).`
    );
  }

  const db = forWorkspace(ctx.workspaceId);
  const task = await db.task.create({
    data: {
      workspaceId: ctx.workspaceId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      state: "READY",
    },
  });
  await auditMcpToolCall(ctx, {
    toolName: "tasks.create",
    action: "CREATE",
    objectType: "Task",
    objectId: task.id,
  });
  return task;
};

export type TaskUpdateResult =
  | { readonly status: "OK"; readonly task: unknown }
  | { readonly status: "HUMAN_REQUIRED"; readonly from: TaskState }
  | { readonly status: "BLOCKED_TRANSITION"; readonly from: TaskState }
  | { readonly status: "MISSING_EVIDENCE" };

/**
 * `tasks.update` (M12-T02/T03) — the state-transition tool, and the one
 * place M12-T03's "MCP never bypasses AuthorityGate" is load-bearing:
 * every call goes through `canTransitionTask(from, to, "AGENT")`, the
 * exact same guard (packages/domain, M02-T04) the web app's
 * complete-action.ts calls with `"USER"`. Per that guard's own real rule
 * (SPEC-ROUTINES-001 §7 AuthorityGate baseline), an AGENT actor is only
 * auto-allowed BACKLOG_VALIDATED→READY (or any →BLOCKED) — →DOING,
 * →VERIFY, →DONE always come back HUMAN_REQUIRED for an external MCP
 * caller, never silently performed. This is a real behavioral
 * difference from the web app's own `/complete-action`, not an
 * oversight: an MCP client can move work into READY or flag it BLOCKED
 * on its own, but completing it is deliberately left to the human at
 * the keyboard.
 */
export const tasksUpdate = async (
  ctx: McpToolContext,
  input: {
    readonly taskId: string;
    readonly toState: TaskState;
    readonly evidence?: {
      readonly description: string;
      readonly grade: EvidenceGrade;
      readonly url?: string;
    };
  }
): Promise<TaskUpdateResult> => {
  const db = forWorkspace(ctx.workspaceId);
  const task = await db.task.findUnique({ where: { id: input.taskId } });
  if (!task) {
    throw new TaskNotFoundError(input.taskId);
  }

  const decision = canTransitionTask(task.state, input.toState, "AGENT");
  if (decision === "BLOCK") {
    return { status: "BLOCKED_TRANSITION", from: task.state };
  }
  if (decision === "HUMAN_REQUIRED") {
    return { status: "HUMAN_REQUIRED", from: task.state };
  }

  // "'feito' não substitui evidência" — same invariant complete-action.ts
  // enforces for the web app's DONE path.
  if (input.toState === "DONE" && !input.evidence) {
    return { status: "MISSING_EVIDENCE" };
  }

  const [updatedTask] = await db.$transaction([
    db.task.update({
      where: { id: input.taskId },
      data: { state: input.toState },
    }),
    ...(input.evidence
      ? [
          db.evidence.create({
            data: {
              workspaceId: ctx.workspaceId,
              taskId: input.taskId,
              grade: input.evidence.grade,
              description: input.evidence.description,
              url: input.evidence.url,
            },
          }),
        ]
      : []),
  ]);

  await auditMcpToolCall(ctx, {
    toolName: "tasks.update",
    action: "TASK_STATE_TRANSITION",
    objectType: "Task",
    objectId: input.taskId,
    metadata: { from: task.state, to: input.toState },
  });

  return { status: "OK", task: updatedTask };
};
