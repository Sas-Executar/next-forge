/**
 * Idempotency key builders (§9). Pure string composition — the actual
 * uniqueness enforcement for `run_key` lives at the database level
 * (RoutineRun.runKey `@unique`, packages/database/prisma/schema.prisma),
 * which is what makes "execução duplicada do mesmo scheduled slot" (§12)
 * a real guarantee rather than an application-level convention that
 * could be bypassed by a second concurrent process.
 */
export const buildRunKey = (routineId: string, scheduledSlot: string): string =>
  `${routineId}:${scheduledSlot}`;

export const buildMutationKey = (
  runId: string,
  objectId: string,
  targetState: string
): string => `${runId}:${objectId}:${targetState}`;

export const buildDeliveryKey = (
  reportId: string,
  channel: string,
  recipientRef: string | null
): string => `${reportId}:${channel}:${recipientRef ?? "none"}`;
