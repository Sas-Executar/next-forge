import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { buildStatusReport as BuildStatusReport } from "../src/builder";
import { validateStatusReport } from "../src/status-report-schema";

const PLACEHOLDER_PATTERN = /\{\{[A-Z0-9_]+\}\}/;

/**
 * Exercises the real DB-backed builder against a live Postgres — same
 * skip/dynamic-import pattern as packages/application/__tests__/
 * next-action.test.ts and packages/agent-runtime/__tests__/commands.test.ts.
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/reports).
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "buildStatusReport (M07-T01)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let buildStatusReport: typeof BuildStatusReport;
    let workspaceId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ buildStatusReport } = await import("../src/builder"));

      const workspace = await database.workspace.create({
        data: {
          clerkOrgId: `org_reports_test_${suffix}`,
          name: "Reports Test",
        },
      });
      workspaceId = workspace.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("an empty workspace produces a valid, honest report", async () => {
      const report = await buildStatusReport(workspaceId);
      expect(() => validateStatusReport(report)).not.toThrow();
      expect(report.progress.project_percent).toBe(0);
      expect(report.triptych.current).toBeNull();
      expect(report.properties.problem).toBe("Nenhum bloqueio identificado.");
      expect(report.gaps.length).toBeGreaterThan(0);
    });

    test("reflects real task state — DOING becomes triptych.current, DONE becomes triptych.previous", async () => {
      const project = await database.project.create({
        data: { workspaceId, name: `Report project ${suffix}` },
      });
      await database.task.create({
        data: {
          workspaceId,
          projectId: project.id,
          title: "Done task",
          state: "DONE",
        },
      });
      await database.task.create({
        data: {
          workspaceId,
          projectId: project.id,
          title: "Doing task",
          state: "DOING",
        },
      });

      const report = await buildStatusReport(workspaceId);
      expect(() => validateStatusReport(report)).not.toThrow();
      expect(report.triptych.current?.title).toBe("Doing task");
      expect(report.triptych.previous?.title).toBe("Done task");
      expect(report.now?.title).toBe("Doing task");
    });

    test("never renders literal placeholder text anywhere in the output", async () => {
      const report = await buildStatusReport(workspaceId);
      const serialized = JSON.stringify(report);
      expect(serialized).not.toMatch(PLACEHOLDER_PATTERN);
    });
  }
);
