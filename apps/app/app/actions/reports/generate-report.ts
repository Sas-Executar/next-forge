"use server";

import { requireRole } from "@repo/auth/server";
import { forWorkspace, Prisma } from "@repo/database";
import { buildStatusReport } from "@repo/reports";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const generateReportSchema = z.object({
  projectId: z.string().optional(),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;

/**
 * Generates and persists one StatusReport (M07-T02), the write side of
 * M07-T01's builder. Every field in the report is computed by
 * buildStatusReport() from real domain data — this action's only job is
 * running that computation for the authenticated workspace and
 * recording the result, same division of labor as M04's
 * completeAction: the derivation lives in a pure(ish) builder, the
 * action only adds auth + persistence + the audit trail.
 *
 * SPEC-ROUTINES-001 §5's own pipeline normally produces a StatusReport
 * as a RoutineRun's output (§1); the routine engine is M10, not built
 * yet, so `routineRunId` stays unset — every report generated here is
 * a manual one, same disclosed gap as builder.ts's own `gaps` array.
 */
export const generateReport = async (input: GenerateReportInput = {}) => {
  const { projectId } = generateReportSchema.parse(input);
  const { workspace, membership } = await requireRole("MEMBER");
  const db = forWorkspace(workspace.id);

  const report = await buildStatusReport(workspace.id, projectId);

  const created = await db.statusReport.create({
    data: {
      id: report.report_id,
      workspaceId: workspace.id,
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
      workspaceId: workspace.id,
      actorType: "USER",
      actorRef: membership.clerkUserId,
      action: "STATUS_REPORT_GENERATED",
      objectType: "StatusReport",
      objectId: created.id,
    },
  });

  revalidatePath("/reports");
  return created;
};
