import "server-only";

import { requireRole } from "@repo/auth/server";
import { forWorkspace } from "@repo/database";

export interface WorkspaceDataExport {
  readonly data: {
    readonly actions: unknown[];
    readonly agentRuns: unknown[];
    readonly aiUsages: unknown[];
    readonly attachments: unknown[];
    readonly auditEvents: unknown[];
    readonly deliverables: unknown[];
    readonly dependencies: unknown[];
    readonly evidences: unknown[];
    readonly executionCredits: unknown[];
    readonly externalObjectRefs: unknown[];
    readonly integrationConnections: unknown[];
    readonly mapaOsArtifacts: unknown[];
    readonly memberships: unknown[];
    readonly notifications: unknown[];
    readonly processes: unknown[];
    readonly projects: unknown[];
    readonly routineRuns: unknown[];
    readonly routines: unknown[];
    readonly scannerMutations: unknown[];
    readonly statusReports: unknown[];
    readonly subscription: unknown;
    readonly tasks: unknown[];
    readonly telemetryEvents: unknown[];
    readonly toolCalls: unknown[];
    readonly usageLedgerEntries: unknown[];
    readonly visualSymbols: unknown[];
    readonly workflowDefinitions: unknown[];
    readonly workflowRuns: unknown[];
  };
  readonly exportedAt: string;
  readonly workspace: {
    readonly createdAt: Date;
    readonly id: string;
    readonly name: string;
  };
}

/**
 * M16-T03 — LGPD data export ("acesso"/"portabilidade"). The Blueprint
 * never names LGPD, but this is a Brazil-first product handling real
 * personal/operational data — OBJETIVOS...:1520-1534 flags privacy
 * requirements as implied, unnamed. Real dump, not a stub: every
 * workspace-scoped model in packages/database/prisma/schema.prisma,
 * queried through the same RLS-scoped `forWorkspace()` client every
 * other read path in this repo uses — no bypass, no partial table list.
 *
 * Scoped to one Workspace, not one Membership/user: this codebase has no
 * per-user-within-a-shared-workspace data partition (Task/Project/etc.
 * belong to the workspace, not to whichever member created them) — a
 * finer per-user export would have to fabricate a boundary that doesn't
 * exist in the schema. Disclosed here rather than silently exporting
 * "everything" under a misleading "your data" label. OWNER-gated (same
 * bar as /settings/billing, /admin/dashboard) since this surfaces every
 * member's activity in the workspace, not just the caller's own.
 *
 * `IntegrationConnection`'s encrypted OAuth token columns
 * (`accessTokenEncrypted`/`refreshTokenEncrypted`/`webhookSecret`) are
 * deliberately excluded via `select` below: the ciphertext is useless
 * without `INTEGRATIONS_ENCRYPTION_KEY` (never exported) and portability
 * doesn't require handing back a durable credential, encrypted or not.
 */
export const exportWorkspaceData = async (): Promise<WorkspaceDataExport> => {
  const { workspace } = await requireRole("OWNER");
  const db = forWorkspace(workspace.id);

  const [
    memberships,
    projects,
    processes,
    deliverables,
    tasks,
    actions,
    evidences,
    dependencies,
    routines,
    routineRuns,
    workflowDefinitions,
    workflowRuns,
    statusReports,
    mapaOsArtifacts,
    visualSymbols,
    scannerMutations,
    attachments,
    integrationConnections,
    externalObjectRefs,
    agentRuns,
    toolCalls,
    aiUsages,
    notifications,
    subscription,
    usageLedgerEntries,
    executionCredits,
    auditEvents,
    telemetryEvents,
  ] = await Promise.all([
    db.membership.findMany(),
    db.project.findMany(),
    db.process.findMany(),
    db.deliverable.findMany(),
    db.task.findMany(),
    db.action.findMany(),
    db.evidence.findMany(),
    db.dependency.findMany(),
    db.routine.findMany(),
    db.routineRun.findMany(),
    db.workflowDefinition.findMany(),
    db.workflowRun.findMany(),
    db.statusReport.findMany(),
    db.mapaOS.findMany(),
    db.visualSymbol.findMany(),
    db.scannerMutation.findMany(),
    db.attachment.findMany(),
    db.integrationConnection.findMany({
      select: {
        id: true,
        provider: true,
        status: true,
        externalAccountId: true,
        scopes: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.externalObjectRef.findMany(),
    db.agentRun.findMany(),
    db.toolCall.findMany(),
    db.aIUsage.findMany(),
    db.notification.findMany(),
    db.subscription.findUnique({ where: { workspaceId: workspace.id } }),
    db.usageLedger.findMany(),
    db.executionCredit.findMany(),
    db.auditEvent.findMany(),
    db.telemetryEvent.findMany(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt,
    },
    data: {
      memberships,
      projects,
      processes,
      deliverables,
      tasks,
      actions,
      evidences,
      dependencies,
      routines,
      routineRuns,
      workflowDefinitions,
      workflowRuns,
      statusReports,
      mapaOsArtifacts,
      visualSymbols,
      scannerMutations,
      attachments,
      integrationConnections,
      externalObjectRefs,
      agentRuns,
      toolCalls,
      aiUsages,
      notifications,
      subscription,
      usageLedgerEntries,
      executionCredits,
      auditEvents,
      telemetryEvents,
    },
  };
};
