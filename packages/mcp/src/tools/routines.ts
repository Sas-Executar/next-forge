import "server-only";

import { forWorkspace } from "@repo/database";
import { type RoutineRunResult, runRoutine } from "@repo/routines";
import type { McpToolContext } from "../context";

/** `routines.list` (M12-T02) — this workspace's Routine configs (not runs). */
export const routinesList = (ctx: McpToolContext) =>
  forWorkspace(ctx.workspaceId).routine.findMany({
    orderBy: { updatedAt: "desc" },
  });

/**
 * `routines.run` (M12-T02) — an on-demand invocation of the exact same
 * `runRoutine()` pipeline (packages/routines, M10) apps/api's
 * `/cron/routines` scheduler calls. `scheduledSlot` defaults to "now"
 * (ISO timestamp at call time) when the caller doesn't supply one — a
 * disclosed choice for a manual trigger, not a Blueprint-specified
 * value: SPEC-ROUTINES-001 §9's idempotency key is
 * `routine_id+scheduled_slot`, so two manual runs issued in the same
 * instant still correctly dedupe rather than double-execute, exercising
 * the same real idempotency guarantee a cron-driven run relies on.
 */
export const routinesRun = (
  ctx: McpToolContext,
  input: { readonly routineId: string; readonly scheduledSlot?: string }
): Promise<RoutineRunResult> =>
  runRoutine(
    ctx.workspaceId,
    input.routineId,
    input.scheduledSlot ?? new Date().toISOString()
  );
