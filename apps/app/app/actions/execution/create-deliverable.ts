"use server";

import { requireRole } from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createDeliverableSchema = z.object({
  projectId: z.string().min(1).optional(),
  processId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;

export const createDeliverable = async (input: CreateDeliverableInput) => {
  const { projectId, processId, title, description, dueDate } =
    createDeliverableSchema.parse(input);
  const { workspace, membership } = await requireRole("MEMBER");
  const db = forWorkspace(workspace.id);

  // RLS scopes the FK targets to this workspace already (a projectId
  // from another tenant simply won't resolve), but a friendlier 404
  // beats a bare Prisma FK-violation for a bad/foreign id.
  if (projectId) {
    await db.project.findUniqueOrThrow({ where: { id: projectId } });
  }
  if (processId) {
    await db.process.findUniqueOrThrow({ where: { id: processId } });
  }

  const deliverable = await db.deliverable.create({
    data: {
      workspaceId: workspace.id,
      projectId,
      processId,
      title,
      description,
      dueDate,
    },
  });

  await db.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      actorType: "USER",
      actorRef: membership.clerkUserId,
      action: "CREATE",
      objectType: "Deliverable",
      objectId: deliverable.id,
    },
  });

  revalidatePath("/projects");

  return deliverable;
};
