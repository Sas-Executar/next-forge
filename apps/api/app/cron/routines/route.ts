import { discoverDueRoutines, runRoutine } from "@repo/routines";
import { env } from "@/env";

/** Matches apps/api/vercel.json's cron entry for this route. Must be at
 * least as long as the actual cron interval below, or a routine's due
 * window could close between two polls with nothing ever catching it. */
const POLL_TOLERANCE_MS = 15 * 60 * 1000;

interface RoutineRunOutcome {
  readonly routineId: string;
  readonly status: string;
}

/**
 * Routine scheduler (M10-T03). Discovers due, ENABLED routines across
 * every workspace (packages/routines' discoverDueRoutines, via the
 * narrow forSystemJob() RLS carve-out) and runs each one through the
 * real pipeline (packages/routines' runRoutine) — the same pipeline
 * M10's own DB-gated tests exercise directly, not a second code path.
 */
export const GET = async (request: Request) => {
  if (env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();
  const { due, invalidConfigCount } = await discoverDueRoutines(
    now,
    POLL_TOLERANCE_MS
  );

  const outcomes: RoutineRunOutcome[] = [];
  for (const routine of due) {
    try {
      const result = await runRoutine(
        routine.workspaceId,
        routine.routineId,
        routine.scheduledSlot
      );
      outcomes.push({ routineId: routine.routineId, status: result.status });
    } catch (error) {
      outcomes.push({
        routineId: routine.routineId,
        status: `ERROR: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    }
  }

  return Response.json({
    checkedAt: now.toISOString(),
    due: due.length,
    invalidConfigCount,
    outcomes,
  });
};
