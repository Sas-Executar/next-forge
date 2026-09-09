import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { database as Database } from "../index";
import type { forWorkspace as ForWorkspace } from "../rls";

/**
 * RLS is a database-enforced guarantee (prisma/migrations/*_enable_rls) —
 * it cannot be meaningfully verified with mocks, only against a real
 * Postgres instance with the migrations actually applied. Skipped, not
 * failed, when no DATABASE_URL is configured (e.g. this sandbox) so
 * `bun run test` stays green everywhere while remaining real,
 * executable coverage wherever a database is reachable (CI with a
 * service container, or local dev against a scratch Neon branch).
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/database).
 *
 * `../index` and `../rls` are imported dynamically inside `beforeAll`,
 * not at module scope: `describe.skipIf` skips a suite's hooks along
 * with its tests, but NOT the file's own top-level imports — and
 * `../index` constructs its Prisma/Neon adapter eagerly at import time,
 * which validates (and requires) DATABASE_URL immediately. A static
 * import here would crash before skipIf ever gets a chance to apply.
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "Row Level Security (M03-T03)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let forWorkspace: typeof ForWorkspace;
    let workspaceA: { id: string };
    let workspaceB: { id: string };
    let taskA: { id: string };
    let taskB: { id: string };

    beforeAll(async () => {
      ({ database } = await import("../index"));
      ({ forWorkspace } = await import("../rls"));

      // Setup uses the unscoped `database` export deliberately — it's
      // the Postgres table owner and bypasses RLS by design (see
      // rls.ts), which is exactly what fixture setup needs.
      workspaceA = await database.workspace.create({
        data: { clerkOrgId: `org_rls_test_a_${suffix}`, name: "RLS Test A" },
      });
      workspaceB = await database.workspace.create({
        data: { clerkOrgId: `org_rls_test_b_${suffix}`, name: "RLS Test B" },
      });
      taskA = await database.task.create({
        data: { workspaceId: workspaceA.id, title: "Task in workspace A" },
      });
      taskB = await database.task.create({
        data: { workspaceId: workspaceB.id, title: "Task in workspace B" },
      });
    });

    afterAll(async () => {
      // Cascades to every child row (all FKs to Workspace/Task are ON
      // DELETE CASCADE — see schema.prisma).
      await database.workspace.deleteMany({
        where: { id: { in: [workspaceA.id, workspaceB.id] } },
      });
      await database.$disconnect();
    });

    test("a workspace-scoped client only sees its own Workspace row", async () => {
      const dbA = forWorkspace(workspaceA.id);
      const visible = await dbA.workspace.findMany();
      expect(visible.map((w) => w.id)).toEqual([workspaceA.id]);
    });

    test("a workspace-scoped client only sees its own Task rows", async () => {
      const dbA = forWorkspace(workspaceA.id);
      const visible = await dbA.task.findMany();
      expect(visible.map((t) => t.id)).toEqual([taskA.id]);
      expect(visible.map((t) => t.id)).not.toContain(taskB.id);
    });

    test("cross-workspace read by id returns nothing (RLS filters, not a permission error)", async () => {
      const dbA = forWorkspace(workspaceA.id);
      const found = await dbA.task.findUnique({ where: { id: taskB.id } });
      expect(found).toBeNull();
    });

    test("WITH CHECK rejects inserting a row into a different workspace", async () => {
      const dbA = forWorkspace(workspaceA.id);
      await expect(
        dbA.task.create({
          data: { workspaceId: workspaceB.id, title: "Should be rejected" },
        })
      ).rejects.toThrow();
    });

    test("cross-workspace update is a no-op — RLS hides the row before UPDATE can touch it", async () => {
      const dbA = forWorkspace(workspaceA.id);
      await expect(
        dbA.task.update({
          where: { id: taskB.id },
          data: { title: "Should not apply" },
        })
      ).rejects.toThrow();

      const stillOriginal = await database.task.findUniqueOrThrow({
        where: { id: taskB.id },
      });
      expect(stillOriginal.title).toBe("Task in workspace B");
    });
  }
);
