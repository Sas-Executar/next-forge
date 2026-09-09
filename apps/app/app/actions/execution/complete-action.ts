"use server";

import { requireRole } from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import { canTransitionTask } from "@repo/domain";
import { taskStateSchema } from "@repo/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const completeActionSchema = z.object({
  taskId: z.string().min(1),
  toState: taskStateSchema,
  evidence: z
    .object({
      description: z.string().min(1).max(2000),
      grade: z.enum([
        "A_OBSERVADO",
        "B_PRIMARIO",
        "C_PUBLICADO",
        "D_INTERNO",
        "E_INFERIDO",
      ]),
      url: z.string().url().optional(),
    })
    .optional(),
});

export type CompleteActionInput = z.infer<typeof completeActionSchema>;

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task ${taskId} not found in this workspace.`);
    this.name = "TaskNotFoundError";
  }
}

export class IllegalTransitionError extends Error {
  constructor(from: string, to: string, decision: string) {
    super(`${from} -> ${to} was not authorized (AuthorityGate: ${decision}).`);
    this.name = "IllegalTransitionError";
  }
}

export class MissingEvidenceError extends Error {
  constructor(taskId: string) {
    super(
      `Task ${taskId}: DONE requires evidence — "feito" não substitui evidência.`
    );
    this.name = "MissingEvidenceError";
  }
}

/**
 * Advances one task's state (M04-T03), the write side of the vertical
 * slice: Task → Action → Eligibility → Best Next Action → Execute →
 * Evidence → Progress → Recalculate. "Progress" and "Recalculate" are
 * derived, not persisted — /now and /projects recompute the Best Next
 * Action and completion counts on every read (skills/copiloto-executar/
 * SKILL.md, Blueprint, read-only: "Percentuais são derivados, nunca
 * manuais quando computável") — this action's only job is the
 * transition + evidence + audit trail.
 */
export const completeAction = async (input: CompleteActionInput) => {
  const { taskId, toState, evidence } = completeActionSchema.parse(input);
  const { workspace, membership } = await requireRole("MEMBER");
  const db = forWorkspace(workspace.id);

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  const decision = canTransitionTask(task.state, toState, "USER");
  if (decision !== "ALLOW") {
    throw new IllegalTransitionError(task.state, toState, decision);
  }

  // Core domain invariant (Blueprint, read-only, both copiloto-executar
  // and executar-mapa-os skills): "'feito' não substitui evidência" —
  // DONE always requires a matching Evidence row.
  if (toState === "DONE" && !evidence) {
    throw new MissingEvidenceError(taskId);
  }

  const [updatedTask] = await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { state: toState } }),
    ...(evidence
      ? [
          db.evidence.create({
            data: {
              workspaceId: workspace.id,
              taskId,
              grade: evidence.grade,
              description: evidence.description,
              url: evidence.url,
            },
          }),
        ]
      : []),
    db.auditEvent.create({
      data: {
        workspaceId: workspace.id,
        actorType: "USER",
        actorRef: membership.clerkUserId,
        action: "TASK_STATE_TRANSITION",
        objectType: "Task",
        objectId: taskId,
        metadata: { from: task.state, to: toState },
      },
    }),
  ]);

  revalidatePath("/now");
  revalidatePath("/projects");

  return updatedTask;
};
