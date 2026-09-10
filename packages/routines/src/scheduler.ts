import { forSystemJob } from "@repo/database";
import { parseCronExpression } from "cron-schedule";
import { routineConfigSchema } from "./types";

export interface DueRoutine {
  readonly routineId: string;
  readonly scheduledSlot: string;
  readonly workspaceId: string;
}

/**
 * A routine is "due" at `now` when its most recent scheduled fire time
 * (per its cron expression) falls within the last `toleranceMs` — the
 * gap between the scheduler's own poll interval (apps/api/vercel.json's
 * cron entry) and each routine's individual schedule granularity.
 * `toleranceMs` must be at least the scheduler's poll interval, or a
 * routine's due window could close between two polls with nothing ever
 * catching it.
 *
 * Disclosed limitation: `RoutineConfig.trigger.timezone` (§2) is stored
 * but not applied here — cron-schedule has no IANA timezone conversion,
 * so every schedule effectively runs against the server process's own
 * clock (UTC on Vercel) until a real conversion is wired in.
 */
export const isRoutineDue = (
  cronExpression: string,
  now: Date,
  toleranceMs: number
): { readonly due: boolean; readonly scheduledSlot: string } => {
  const cron = parseCronExpression(cronExpression);
  const prev = cron.getPrevDate(new Date(now.getTime() + 1));
  return {
    due: now.getTime() - prev.getTime() <= toleranceMs,
    scheduledSlot: prev.toISOString(),
  };
};

/**
 * Cross-tenant discovery of due, ENABLED routines (M10-T03) — uses
 * forSystemJob() (packages/database/rls.ts), the one narrow, read-only
 * RLS carve-out for exactly this: the scheduler has no single workspace
 * to scope to before it knows which workspaces even have due routines.
 */
export const discoverDueRoutines = async (
  now: Date,
  toleranceMs: number
): Promise<{
  readonly due: readonly DueRoutine[];
  readonly invalidConfigCount: number;
}> => {
  const db = forSystemJob();
  const enabledRoutines = await db.routine.findMany({
    where: { status: "ENABLED" },
  });

  const due: DueRoutine[] = [];
  let invalidConfigCount = 0;
  for (const routine of enabledRoutines) {
    const parsed = routineConfigSchema.safeParse(routine.config);
    if (!parsed.success) {
      invalidConfigCount++;
      continue;
    }
    const { due: isDue, scheduledSlot } = isRoutineDue(
      parsed.data.trigger.schedule,
      now,
      toleranceMs
    );
    if (isDue) {
      due.push({
        routineId: routine.id,
        workspaceId: routine.workspaceId,
        scheduledSlot,
      });
    }
  }

  return { due, invalidConfigCount };
};
