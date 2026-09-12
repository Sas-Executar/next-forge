import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { emitBusinessEvent as EmitBusinessEvent } from "../business-events";

/**
 * Exercises the real TelemetryEvent persistence against a live Postgres
 * — same skip/dynamic-import pattern as every other DB-gated suite in
 * this repo. Run manually with: `DATABASE_URL=... bun run test`
 * (packages/observability).
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "emitBusinessEvent (M15-T02)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let emitBusinessEvent: typeof EmitBusinessEvent;
    let workspaceId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ emitBusinessEvent } = await import("../business-events"));

      const workspace = await database.workspace.create({
        data: { clerkOrgId: `org_obs_test_${suffix}`, name: "Obs Test" },
      });
      workspaceId = workspace.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("persists a real TelemetryEvent row with a generated traceId", async () => {
      await emitBusinessEvent(workspaceId, {
        eventName: "product.core_action_completed",
        component: "test",
        outcome: "success",
        metadata: { taskId: "task_123" },
      });

      const [event] = await database.telemetryEvent.findMany({
        where: { workspaceId, eventName: "product.core_action_completed" },
      });
      expect(event.component).toBe("test");
      expect(event.outcome).toBe("success");
      expect(event.traceId).toBeTruthy();
      expect(event.metadata).toEqual({ taskId: "task_123" });
    });

    test("reuses a supplied traceId instead of generating a new one", async () => {
      await emitBusinessEvent(workspaceId, {
        eventName: "ai.usage_recorded",
        component: "test",
        outcome: "success",
        traceId: "trace-fixed-1",
        costBrl: 1.5,
      });

      const [event] = await database.telemetryEvent.findMany({
        where: { workspaceId, traceId: "trace-fixed-1" },
      });
      expect(event.traceId).toBe("trace-fixed-1");
      expect(Number(event.costBrl)).toBe(1.5);
    });
  }
);
