import {
  DELIVERY_STATUS_TRANSITIONS,
  type DeliveryStatus,
  ROUTINE_STATUS_TRANSITIONS,
  type RoutineStatus,
  RUN_STATUS_TRANSITIONS,
  type RunStatus,
} from "@repo/schemas";

/**
 * Structural-only guards for Routine's three sub-lifecycles (see
 * packages/schemas/src/routine.ts for why these aren't actor-gated,
 * unlike Task). Same pure/no-I/O contract as canTransitionTask.
 */
export const canTransitionRoutineStatus = (
  from: RoutineStatus,
  to: RoutineStatus
): boolean => ROUTINE_STATUS_TRANSITIONS[from].includes(to);

export const canTransitionRunStatus = (
  from: RunStatus,
  to: RunStatus
): boolean => RUN_STATUS_TRANSITIONS[from].includes(to);

export const canTransitionDeliveryStatus = (
  from: DeliveryStatus,
  to: DeliveryStatus
): boolean => DELIVERY_STATUS_TRANSITIONS[from].includes(to);
