import { forWorkspace, Prisma } from "@repo/database";
import type { WorkflowStep, WorkflowStepResult } from "./types";
import { workflowDefinitionConfigSchema } from "./types";

export class WorkflowNotFoundError extends Error {
  constructor(workflowDefinitionId: string) {
    super(`WorkflowDefinition ${workflowDefinitionId} not found`);
    this.name = "WorkflowNotFoundError";
  }
}

export interface WorkflowRunResult {
  readonly runId: string;
  readonly status: "SUCCESS" | "FAILED";
  readonly steps: readonly WorkflowStepResult[];
}

type WorkspaceDb = ReturnType<typeof forWorkspace>;

/**
 * Executes one step. Only two real actions exist today:
 * - `create_task`: a genuine write, same shape as
 *   apps/app/app/actions/execution/create-task.ts.
 * - `notify`: records an AuditEvent — this repo has no generic
 *   in-app-notification delivery target yet (packages/notifications
 *   wraps Knock for user-facing feed items, a different concern from a
 *   workflow step's own audit trail), so "notify" is honestly just the
 *   audit record, not a fabricated delivery.
 *
 * `complete_task` is deliberately NOT an action here: every other write
 * path in this repo that reaches DONE goes through canTransitionTask's
 * AuthorityGate + a real Evidence row (M04's completeAction, M06's
 * /fechardia) — a workflow step auto-completing a task would bypass
 * both. Not implemented, not stubbed as a fake success.
 */
const executeStep = async (
  db: WorkspaceDb,
  workspaceId: string,
  step: WorkflowStep
): Promise<void> => {
  switch (step.action) {
    case "create_task": {
      const title = step.params.title;
      if (typeof title !== "string" || title.length === 0) {
        throw new Error("create_task requires a non-empty string params.title");
      }
      const projectId =
        typeof step.params.projectId === "string"
          ? step.params.projectId
          : undefined;
      await db.task.create({ data: { workspaceId, title, projectId } });
      return;
    }
    case "notify": {
      const message = step.params.message;
      if (typeof message !== "string" || message.length === 0) {
        throw new Error("notify requires a non-empty string params.message");
      }
      await db.auditEvent.create({
        data: {
          workspaceId,
          actorType: "SYSTEM",
          action: "workflow.notify",
          objectType: "WorkflowStep",
          objectId: step.id,
          metadata: { message },
        },
      });
      return;
    }
    default: {
      const exhaustive: never = step.action;
      throw new Error(
        `Unhandled workflow step action: ${exhaustive as string}`
      );
    }
  }
};

/**
 * Runs a WorkflowDefinition's steps sequentially (M10-T05). Stops at
 * the first failure — no retry or rollback semantics are defined by
 * any source (§20 gives none), so "stop and report" is the honest
 * default rather than inventing a compensation model.
 */
export const runWorkflow = async (
  workspaceId: string,
  workflowDefinitionId: string
): Promise<WorkflowRunResult> => {
  const db = forWorkspace(workspaceId);
  const definition = await db.workflowDefinition.findUnique({
    where: { id: workflowDefinitionId },
  });
  if (!definition) {
    throw new WorkflowNotFoundError(workflowDefinitionId);
  }
  const config = workflowDefinitionConfigSchema.parse(definition.definition);

  const run = await db.workflowRun.create({
    data: { workspaceId, workflowDefinitionId, status: "RUNNING" },
  });

  const steps: WorkflowStepResult[] = [];
  for (const step of config.steps) {
    try {
      await executeStep(db, workspaceId, step);
      steps.push({
        stepId: step.id,
        action: step.action,
        status: "OK",
        error: null,
      });
    } catch (error) {
      steps.push({
        stepId: step.id,
        action: step.action,
        status: "FAILED",
        error: error instanceof Error ? error.message : "unknown error",
      });
      break;
    }
  }

  const finalStatus = steps.every((s) => s.status === "OK")
    ? "SUCCESS"
    : "FAILED";
  await db.workflowRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      finishedAt: new Date(),
      // The readonly-field WorkflowStepResult[] type isn't structurally
      // assignable to Prisma's mutable InputJsonValue — it's still a
      // plain, JSON-serializable array, hence the cast rather than a
      // schema change.
      result:
        steps.length > 0
          ? ({ steps } as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  });

  return { runId: run.id, status: finalStatus, steps };
};
