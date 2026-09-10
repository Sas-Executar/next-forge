import { forWorkspace, Prisma } from "@repo/database";
import type { StatusReport } from "@repo/reports";

export interface AppReportsDeliveryOutput {
  readonly reportId: string;
  readonly status: "sent";
}

/**
 * app_reports channel (§8): "persiste report completo... status é
 * confirmado após persistência." This function IS that persistence
 * step, not a notification sent after the fact — same StatusReport
 * write shape apps/app's generate-report action uses (M07), plus
 * `routineRunId` linking the report back to the run that produced it.
 */
export const deliverAppReport = async (
  workspaceId: string,
  routineRunId: string,
  report: StatusReport
): Promise<AppReportsDeliveryOutput> => {
  const db = forWorkspace(workspaceId);
  const created = await db.statusReport.create({
    data: {
      id: report.report_id,
      workspaceId,
      projectId: report.project_id,
      routineRunId,
      status: report.status,
      progress: report.progress,
      triptych: report.triptych,
      now: report.now ?? Prisma.JsonNull,
      properties: report.properties,
      evidenceRefs: report.evidence_refs,
      gaps: report.gaps,
    },
  });
  return { status: "sent", reportId: created.id };
};
