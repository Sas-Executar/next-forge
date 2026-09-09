import { z } from "zod";

/**
 * Routine state machines (D9). Three independent lifecycles, per
 * PRD-ROUTINES-001 §9 (Blueprint, read-only):
 * - Config:   DRAFT → ENABLED ↔ PAUSED → DISABLED
 * - Run:      SCHEDULED → RUNNING → SUCCESS | PARTIAL | BLOCKED | FAILED
 * - Delivery: PENDING → SENT → DELIVERED | FAILED
 */
export const routineStatusSchema = z.enum([
  "DRAFT",
  "ENABLED",
  "PAUSED",
  "DISABLED",
]);
export type RoutineStatus = z.infer<typeof routineStatusSchema>;

export const runStatusSchema = z.enum([
  "SCHEDULED",
  "RUNNING",
  "SUCCESS",
  "PARTIAL",
  "BLOCKED",
  "FAILED",
]);
export type RunStatus = z.infer<typeof runStatusSchema>;

export const deliveryStatusSchema = z.enum([
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
]);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
