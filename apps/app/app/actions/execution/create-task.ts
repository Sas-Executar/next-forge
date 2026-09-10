"use server";

import { requireRole } from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import { canTransitionTask } from "@repo/domain";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createTaskSchema = z.object({
  projectId: z.string().min(1).optional(),
  processId: z.string().min(1).optional(),
  deliverableId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  /** Tasks that must be DONE before this one is eligible (SPEC-ROUTINES-001 §6). */
  dependsOnTaskIds: z.array(z.string().min(1)).max(20).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export class IllegalInitialStateError extends Error {
  constructor(decision: string) {
    super(`Task creation was not authorized (AuthorityGate: ${decision}).`);
    this.name = "IllegalInitialStateError";
  }
}

export const createTask = async (input: CreateTaskInput) => {
  const {
    projectId,
    processId,
    deliverableId,
    title,
    description,
    dependsOnTaskIds,
  } = createTaskSchema.parse(input);
  const { workspace, membership } = await requireRole("MEMBER");
  const db = forWorkspace(workspace.id);

  // A manually created task is immediately actionable, not left sitting
  // in BACKLOG_VALIDATED awaiting a separate validation step — but the
  // jump is still authorized through the real guard (packages/domain),
  // not just hardcoded as the initial value, so the AuthorityGate stays
  // meaningfully exercised even at creation time.
  const decision = canTransitionTask("BACKLOG_VALIDATED", "READY", "USER");
  if (decision !== "ALLOW") {
    throw new IllegalInitialStateError(decision);
  }

  const task = await db.task.create({
    data: {
      workspaceId: workspace.id,
      projectId,
      processId,
      deliverableId,
      title,
      description,
      state: "READY",
    },
  });

  if (dependsOnTaskIds?.length) {
    // RLS's WITH CHECK scopes toTaskId's row visibility to this
    // workspace already; findMany + count below simply gives a
    // friendlier error than a silent FK failure for a bad/foreign id.
    const resolvable = await db.task.findMany({
      where: { id: { in: dependsOnTaskIds } },
      select: { id: true },
    });
    if (resolvable.length !== dependsOnTaskIds.length) {
      throw new Error(
        "One or more dependsOnTaskIds were not found in this workspace."
      );
    }

    await db.dependency.createMany({
      data: dependsOnTaskIds.map((toTaskId) => ({
        workspaceId: workspace.id,
        fromTaskId: task.id,
        toTaskId,
      })),
    });
  }

  await db.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      actorType: "USER",
      actorRef: membership.clerkUserId,
      action: "CREATE",
      objectType: "Task",
      objectId: task.id,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/now");

  return task;
};
