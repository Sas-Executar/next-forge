"use server";

import { requireRole } from "@repo/auth/server";
import { runRoutine } from "@repo/routines";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const runRoutineSchema = z.object({ routineId: z.string().min(1) });

/**
 * Manual "Executar agora" trigger for /automations (M10-T06). Each
 * manual run gets its own unique scheduled_slot (a timestamp, not a
 * cron-derived one) — so it never collides with or gets deduplicated
 * against the scheduler's own runs (apps/api/app/cron/routines), and
 * two manual clicks in a row both really execute rather than the
 * second one silently returning the first's cached result.
 */
export const runRoutineNow = async (input: { readonly routineId: string }) => {
  const { routineId } = runRoutineSchema.parse(input);
  const { workspace } = await requireRole("MEMBER");

  const result = await runRoutine(
    workspace.id,
    routineId,
    `manual:${Date.now()}`
  );

  revalidatePath("/automations");
  return result;
};
