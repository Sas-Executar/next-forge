"use server";

import { requireRole } from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createProject = async (input: CreateProjectInput) => {
  const { name, description } = createProjectSchema.parse(input);
  const { workspace, membership } = await requireRole("MEMBER");
  const db = forWorkspace(workspace.id);

  const project = await db.project.create({
    data: { workspaceId: workspace.id, name, description },
  });

  await db.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      actorType: "USER",
      actorRef: membership.clerkUserId,
      action: "CREATE",
      objectType: "Project",
      objectId: project.id,
    },
  });

  revalidatePath("/projects");

  return project;
};
