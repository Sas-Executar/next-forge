import { nextAction } from "@repo/application";
import { forWorkspace } from "@repo/database";
import { buildStatusReport } from "@repo/reports";
import { evaluateMutationAuthority } from "./authority-gate";
import { routeDelivery } from "./delivery/router";
import { emitRoutineEvent } from "./events";
import { buildRunKey } from "./idempotency";
import { type RoutineMutation, routineConfigSchema } from "./types";

const INTERNAL_SOURCE_PROVIDER = "internal";

export class RoutineNotFoundError extends Error {
  constructor(routineId: string) {
    super(`Routine ${routineId} not found`);
    this.name = "RoutineNotFoundError";
  }
}

export class RoutineNotEnabledError extends Error {
  constructor(routineId: string, status: string) {
    super(`Routine ${routineId} is not ENABLED (status: ${status})`);
    this.name = "RoutineNotEnabledError";
  }
}

export interface RoutineRunResult {
  readonly blockReason: string | null;
  /** True when this call found an existing run for the slot instead of
   * creating a new one — the observable side of §9's idempotency
   * guarantee, not a separate code path a test has to trust blindly. */
  readonly deduplicated: boolean;
  readonly mutations: readonly RoutineMutation[];
  readonly runId: string;
  readonly status: "SUCCESS" | "PARTIAL" | "BLOCKED" | "FAILED";
}

/**
 * Auto-promotable backlog: every BACKLOG_VALIDATED task whose
 * dependencies (Dependency.fromTaskId = this task) are all DONE. This
 * is the one mutation this pipeline actually performs — `sync_mirror`
 * is real in authority-gate.ts and tested there, but has nothing to
 * mirror from in this implementation: every RoutineConfig source is
 * either "internal" (this workspace's own store, already canonical —
 * mirroring it into itself is a no-op) or unimplemented (M11), so
 * there's no external authority yet to sync mirror state from.
 */
const promotableBacklogTasks = async (workspaceId: string) => {
  const db = forWorkspace(workspaceId);
  const candidates = await db.task.findMany({
    where: { state: "BACKLOG_VALIDATED" },
    include: {
      dependenciesFrom: { include: { toTask: { select: { state: true } } } },
    },
  });
  return candidates.filter((task) =>
    task.dependenciesFrom.every((dep) => dep.toTask.state === "DONE")
  );
};

/**
 * The 19-step execution pipeline (SPEC-ROUTINES-001 §5), condensed to
 * the steps this implementation can honestly perform today:
 *
 *  1-3  load RoutineConfig, build the run_key, "acquire the lock" —
 *       the lock IS RoutineRun.runKey's database-level unique
 *       constraint (packages/database, M02): a second call for the
 *       same slot finds the existing row instead of racing a second
 *       insert, never a duplicate RoutineRun.
 *  4-5  read required sources — only "internal" sources are readable;
 *       a required non-internal source blocks the run with zero
 *       mutations, exactly §5's own rule for a failed required read.
 *  6-8  normalize/reconcile/progress — the internal source already is
 *       the canonical store, so reconciliation is a no-op; progress is
 *       computed once, inside buildStatusReport (step 15), not twice.
 *  9-12 eligibility/WIP/next action — reuses nextAction()
 *       (packages/application), not a second selection algorithm.
 *  13-14 AuthorityGate + execute — only BACKLOG_VALIDATED→READY
 *       promotions for tasks whose dependencies are satisfied, gated
 *       through evaluateMutationAuthority on every single one.
 *  15-19 StatusReport, persist, deliver, record, close.
 */
export const runRoutine = async (
  workspaceId: string,
  routineId: string,
  scheduledSlot: string
): Promise<RoutineRunResult> => {
  const db = forWorkspace(workspaceId);

  const routine = await db.routine.findUnique({ where: { id: routineId } });
  if (!routine) {
    throw new RoutineNotFoundError(routineId);
  }
  if (routine.status !== "ENABLED") {
    throw new RoutineNotEnabledError(routineId, routine.status);
  }
  const config = routineConfigSchema.parse(routine.config);

  const runKey = buildRunKey(routineId, scheduledSlot);
  const existingRun = await db.routineRun.findUnique({ where: { runKey } });
  if (existingRun) {
    return {
      runId: existingRun.id,
      status: existingRun.status as RoutineRunResult["status"],
      blockReason: existingRun.blockReason,
      mutations: (existingRun.mutations as RoutineMutation[] | null) ?? [],
      deduplicated: true,
    };
  }

  const run = await db.routineRun.create({
    data: {
      workspaceId,
      routineId,
      runKey,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
  await emitRoutineEvent(workspaceId, "routine.triggered", run.id, {
    routineId,
    scheduledSlot,
  });

  const missingRequiredSource = config.sources.find(
    (source) => source.required && source.provider !== INTERNAL_SOURCE_PROVIDER
  );
  if (missingRequiredSource) {
    const blockReason = `Required source unavailable: ${missingRequiredSource.source_id} (provider "${missingRequiredSource.provider}" has no adapter yet — external connectors land in M11)`;
    await db.routineRun.update({
      where: { id: run.id },
      data: { status: "BLOCKED", blockReason, finishedAt: new Date() },
    });
    await emitRoutineEvent(workspaceId, "routine.blocked", run.id, {
      reason: blockReason,
    });
    return {
      runId: run.id,
      status: "BLOCKED",
      blockReason,
      mutations: [],
      deduplicated: false,
    };
  }
  await emitRoutineEvent(workspaceId, "routine.source_read", run.id, {
    sources: config.sources.map((source) => source.source_id),
  });
  await emitRoutineEvent(workspaceId, "routine.state_reconciled", run.id);

  const mutations: RoutineMutation[] = [];
  if (config.execution_policy.allowed_mutations.includes("promote_ready")) {
    const promotable = await promotableBacklogTasks(workspaceId);
    for (const task of promotable) {
      const decision = evaluateMutationAuthority({
        type: "task_transition",
        from: "BACKLOG_VALIDATED",
        to: "READY",
      });
      if (decision === "ALLOW") {
        await db.task.update({
          where: { id: task.id },
          data: { state: "READY" },
        });
        mutations.push({
          object_id: task.id,
          from: "BACKLOG_VALIDATED",
          to: "READY",
          authority_rule_id: "SPEC-ROUTINES-001:§7:BACKLOG_VALIDATED->READY",
          evidence_refs: [],
        });
        await emitRoutineEvent(
          workspaceId,
          "routine.mutation_allowed",
          run.id,
          {
            objectId: task.id,
          }
        );
      } else {
        await emitRoutineEvent(
          workspaceId,
          "routine.mutation_blocked",
          run.id,
          {
            objectId: task.id,
            decision,
          }
        );
      }
    }
  }

  // nextAction() isn't a mutation the routine performs — it's read here
  // only so the StatusReport's `now` block (built next, inside
  // buildStatusReport) reflects the same WIP=1 selection /now shows.
  await nextAction(workspaceId);

  const report = await buildStatusReport(workspaceId);
  await emitRoutineEvent(workspaceId, "routine.report_created", run.id, {
    reportId: report.report_id,
  });

  await emitRoutineEvent(workspaceId, "routine.delivery_attempted", run.id);
  const deliveryResults = await routeDelivery(
    workspaceId,
    run.id,
    report,
    config.delivery
  );
  for (const result of deliveryResults) {
    await emitRoutineEvent(
      workspaceId,
      result.status === "sent"
        ? "routine.delivery_sent"
        : "routine.delivery_failed",
      run.id,
      { channel: result.channel, error: result.error }
    );
  }

  const finalStatus = deliveryResults.some((r) => r.status === "failed")
    ? "PARTIAL"
    : "SUCCESS";
  await db.routineRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      finishedAt: new Date(),
      mutations: mutations.length > 0 ? mutations : undefined,
    },
  });
  await emitRoutineEvent(workspaceId, "routine.completed", run.id, {
    status: finalStatus,
  });

  return {
    runId: run.id,
    status: finalStatus,
    blockReason: null,
    mutations,
    deduplicated: false,
  };
};
