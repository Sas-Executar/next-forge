import { describe, expect, test } from "vitest";
import {
  buildDeliveryKey,
  buildMutationKey,
  buildRunKey,
} from "../src/idempotency";

describe("idempotency key builders (M10-T02, §9)", () => {
  test("run_key = routine_id + scheduled_slot", () => {
    expect(buildRunKey("routine-1", "2026-09-10T09:00:00Z")).toBe(
      "routine-1:2026-09-10T09:00:00Z"
    );
  });

  test("same routine + slot always produces the same run_key", () => {
    const a = buildRunKey("routine-1", "slot-1");
    const b = buildRunKey("routine-1", "slot-1");
    expect(a).toBe(b);
  });

  test("mutation_key = run_id + object_id + target_state", () => {
    expect(buildMutationKey("run-1", "task-1", "READY")).toBe(
      "run-1:task-1:READY"
    );
  });

  test("delivery_key = report_id + channel + recipient_ref, with a null-safe fallback", () => {
    expect(buildDeliveryKey("report-1", "email", "user@example.com")).toBe(
      "report-1:email:user@example.com"
    );
    expect(buildDeliveryKey("report-1", "app_reports", null)).toBe(
      "report-1:app_reports:none"
    );
  });
});
