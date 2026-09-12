import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import { NextResponse } from "next/server";

/**
 * M21 — apps/mobile's network boundary for Reports' read-only history
 * (mirrors apps/app's /reports page's own query exactly). Generating a
 * new report is POST /reports/generate — kept as a separate route,
 * matching every other GET/POST split in this repo's apps/api routes.
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
  const reports = await db.statusReport.findMany({
    orderBy: { generatedAt: "desc" },
    take: 20,
  });

  // Json columns (progress/properties) are written exclusively by
  // POST /reports/generate from a real StatusReport (@repo/reports) —
  // trusted shape from this app's own writer, same assumption
  // apps/app's /reports page makes of the same columns.
  return NextResponse.json({
    reports: reports.map((report) => ({
      id: report.id,
      generatedAt: report.generatedAt,
      status: report.status,
      progress: report.progress,
      properties: report.properties,
    })),
  });
};
