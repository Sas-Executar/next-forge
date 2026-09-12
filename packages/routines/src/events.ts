import { forWorkspace, type Prisma } from "@repo/database";

export type RoutineEventName =
  | "routine.triggered"
  | "routine.source_read"
  | "routine.blocked"
  | "routine.state_reconciled"
  | "routine.mutation_allowed"
  | "routine.mutation_blocked"
  | "routine.report_created"
  | "routine.delivery_attempted"
  | "routine.delivery_sent"
  | "routine.delivery_failed"
  | "routine.completed";

/**
 * Internal domain events (§11's minimum event list), recorded as
 * AuditEvent rows — this repo's real audit trail (every other package
 * that mutates state already writes here: M04's completeAction, M06's
 * confirmReplan). D8 (plan §3): `routine.*` stays the internal name;
 * mapping a subset to an external `product.routine_run_completed`
 * business event (OBS-BIZ-001) is M15's job — this only guarantees the
 * internal event exists for that mapping to read from later, not the
 * external emission itself.
 */
export const emitRoutineEvent = async (
  workspaceId: string,
  name: RoutineEventName,
  routineRunId: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  const db = forWorkspace(workspaceId);
  await db.auditEvent.create({
    data: {
      workspaceId,
      actorType: "SYSTEM",
      action: name,
      objectType: "RoutineRun",
      objectId: routineRunId,
      // A generic Record<string, unknown> parameter (the natural type
      // for "whatever flat JSON this particular event carries") isn't
      // structurally assignable to Prisma's InputJsonValue the way a
      // literal object type is — same cast M07/M10's other Json writes
      // use (packages/automation/src/executor.ts) for the same reason.
      metadata: metadata as unknown as Prisma.InputJsonValue | undefined,
    },
  });
};
