import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { forWorkspace, Prisma } from "@repo/database";
import { buildStatusReport } from "@repo/reports";
import { NextResponse } from "next/server";
import { z } from "zod";

const generateReportSchema = z.object({ projectId: z.string().optional() });

/**
 * M21 — apps/mobile's network boundary for generating a StatusReport.
 * Ports apps/app's `generateReport` server action (same reasoning as
 * /now/advance's own comment: a `"use server"` action isn't callable
 * from a React Native client) — identical write, minus
 * `revalidatePath("/reports")`, meaningless outside Next's page cache;
 * the mobile client re-fetches GET /reports after a successful POST.
 */
export const POST = async (request: Request): Promise<Response> => {
  let workspaceId: string;
  let actorRef: string;
  try {
    const { workspace, membership } = await requireRole("MEMBER");
    workspaceId = workspace.id;
    actorRef = membership.clerkUserId;
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

  const body = await request.json().catch(() => ({}));
  const parsed = generateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid body", ok: false },
      { status: 400 }
    );
  }
  const { projectId } = parsed.data;

  const report = await buildStatusReport(workspaceId, projectId);
  const db = forWorkspace(workspaceId);

  const created = await db.statusReport.create({
    data: {
      id: report.report_id,
      workspaceId,
      projectId: report.project_id,
      status: report.status,
      progress: report.progress,
      triptych: report.triptych,
      // A nullable Json column needs the Prisma.JsonNull sentinel for a
      // real SQL NULL — a plain JS `null` isn't a valid write value here.
      now: report.now ?? Prisma.JsonNull,
      properties: report.properties,
      evidenceRefs: report.evidence_refs,
      gaps: report.gaps,
    },
  });

  await db.auditEvent.create({
    data: {
      workspaceId,
      actorType: "USER",
      actorRef,
      action: "STATUS_REPORT_GENERATED",
      objectType: "StatusReport",
      objectId: created.id,
    },
  });

  return NextResponse.json({ ok: true, report: created });
};
