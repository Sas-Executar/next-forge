import { z } from "zod";

/**
 * Routine state machines (D9). Three independent lifecycles, per
 * PRD-ROUTINES-001 §9 (Blueprint, read-only):
 * - Config:   DRAFT → ENABLED ↔ PAUSED → DISABLED
 * - Run:      SCHEDULED → RUNNING → SUCCESS | PARTIAL | BLOCKED | FAILED
 * - Delivery: PENDING → SENT → DELIVERED | FAILED
 *
 * Unlike Task (task-state.ts), none of these three are actor-gated by
 * the Blueprint — RoutineStatus changes are user-initiated (/nova-rotina,
 * /pausar-rotina, ...), while RunStatus/DeliveryStatus are the engine's
 * own execution/delivery bookkeeping. Transition tables here are
 * structural only; packages/domain's guards reflect that.
 */
export const routineStatusSchema = z.enum([
  "DRAFT",
  "ENABLED",
  "PAUSED",
  "DISABLED",
]);
export type RoutineStatus = z.infer<typeof routineStatusSchema>;

export const ROUTINE_STATUS_TRANSITIONS: Readonly<
  Record<RoutineStatus, readonly RoutineStatus[]>
> = {
  DRAFT: ["ENABLED"],
  ENABLED: ["PAUSED", "DISABLED"],
  PAUSED: ["ENABLED", "DISABLED"],
  DISABLED: [],
};

export const runStatusSchema = z.enum([
  "SCHEDULED",
  "RUNNING",
  "SUCCESS",
  "PARTIAL",
  "BLOCKED",
  "FAILED",
]);
export type RunStatus = z.infer<typeof runStatusSchema>;

// Terminal states (SUCCESS/PARTIAL/BLOCKED/FAILED) have no further
// transitions: SPEC-ROUTINES-001's idempotency model (§9,
// `run_key = routine_id + scheduled_slot`) means a retry produces a new
// RoutineRun row, not a reopened one.
export const RUN_STATUS_TRANSITIONS: Readonly<
  Record<RunStatus, readonly RunStatus[]>
> = {
  SCHEDULED: ["RUNNING"],
  RUNNING: ["SUCCESS", "PARTIAL", "BLOCKED", "FAILED"],
  SUCCESS: [],
  PARTIAL: [],
  BLOCKED: [],
  FAILED: [],
};

export const deliveryStatusSchema = z.enum([
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
]);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const DELIVERY_STATUS_TRANSITIONS: Readonly<
  Record<DeliveryStatus, readonly DeliveryStatus[]>
> = {
  PENDING: ["SENT", "FAILED"], // FAILED reachable directly (e.g. invalid recipient before send)
  SENT: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: [],
};
