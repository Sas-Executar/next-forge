import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import { NextResponse } from "next/server";

/**
 * M21 — apps/mobile's network boundary for the Projects list (mirrors
 * apps/app's /projects page's own query exactly). Read-only, list-only
 * — no create-project affordance here; that remains web-only for now
 * (a real, disclosed scope cut, not an oversight — see PRODUCT_AUDIT.md).
 */
export const GET = async (): Promise<Response> => {
  let workspaceId: string;
  try {
    const { workspace } = await requireRole("MEMBER");
    workspaceId = workspace.id;
  } catch (error) {
    if (
      error instanceof NoActiveOrganizationError ||
      error instanceof WorkspaceNotFoundError
    ) {
      return new Response("No active workspace", { status: 409 });
    }
    if (error instanceof InsufficientRoleError) {
      return new Response("Forbidden", { status: 403 });
    }
    throw error;
  }

  const db = forWorkspace(workspaceId);
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true, deliverables: true } } },
  });

  return NextResponse.json({
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      taskCount: project._count.tasks,
      deliverableCount: project._count.deliverables,
    })),
  });
};
