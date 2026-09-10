import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { nextAction as NextAction } from "../src/next-action";

/**
 * Exercises the real DB orchestration (dependency graph queries, WIP
 * check, ranking) against a live Postgres — same constraint and same
 * skip/dynamic-import pattern as packages/database/__tests__/rls.test.ts
 * (see that file's doc comment for why the dynamic import is required,
 * not optional, alongside describe.skipIf).
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/application).
 */
describe.skipIf(!process.env.DATABASE_URL)("nextAction (M04-T02)", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let nextAction: typeof NextAction;
  let workspaceId: string;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ nextAction } = await import("../src/next-action"));

    const workspace = await database.workspace.create({
      data: {
        clerkOrgId: `org_next_action_test_${suffix}`,
        name: "Next Action Test",
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("returns NONE when there are no READY tasks", async () => {
    const result = await nextAction(workspaceId);
    expect(result).toEqual({ kind: "NONE" });
  });

  test("returns the sole eligible task when there is exactly one", async () => {
    const task = await database.task.create({
      data: { workspaceId, title: "Only candidate", state: "READY" },
    });

    const result = await nextAction(workspaceId);
    expect(result.kind).toBe("SELECTED");
    expect(result.kind === "SELECTED" && result.task.id).toBe(task.id);

    await database.task.delete({ where: { id: task.id } });
  });

  test("a task blocked by an incomplete dependency is excluded", async () => {
    const blocker = await database.task.create({
      data: { workspaceId, title: "Blocker", state: "DOING" },
    });
    const blocked = await database.task.create({
      data: { workspaceId, title: "Blocked", state: "READY" },
    });
    await database.dependency.create({
      data: { workspaceId, fromTaskId: blocked.id, toTaskId: blocker.id },
    });

    // WIP=1 is already spent by `blocker` (DOING), so nextAction should
    // surface it directly rather than reach the dependency filter at
    // all — assert that, then finish the blocker and confirm `blocked`
    // is still excluded on its own dependency merits.
    const whileBlockerRunning = await nextAction(workspaceId);
    expect(whileBlockerRunning.kind).toBe("SELECTED");
    expect(
      whileBlockerRunning.kind === "SELECTED" && whileBlockerRunning.task.id
    ).toBe(blocker.id);

    await database.task.update({
      where: { id: blocker.id },
      data: { state: "READY" }, // simulate: not DONE, still incomplete
    });

    const afterBlockerNotDone = await nextAction(workspaceId);
    // blocker itself is now READY and eligible (no deps of its own);
    // blocked is excluded — so blocker should win, never blocked.
    expect(afterBlockerNotDone.kind).toBe("SELECTED");
    expect(
      afterBlockerNotDone.kind === "SELECTED" && afterBlockerNotDone.task.id
    ).not.toBe(blocked.id);

    await database.task.deleteMany({
      where: { id: { in: [blocker.id, blocked.id] } },
    });
  });

  test("higher criticality (more blocked dependents) wins the tie-break", async () => {
    const lowCriticality = await database.task.create({
      data: { workspaceId, title: "Blocks nothing", state: "READY" },
    });
    const highCriticality = await database.task.create({
      data: { workspaceId, title: "Blocks two", state: "READY" },
    });
    const dependent1 = await database.task.create({
      data: { workspaceId, title: "Dependent 1", state: "BACKLOG_VALIDATED" },
    });
    const dependent2 = await database.task.create({
      data: { workspaceId, title: "Dependent 2", state: "BACKLOG_VALIDATED" },
    });
    await database.dependency.createMany({
      data: [
        {
          workspaceId,
          fromTaskId: dependent1.id,
          toTaskId: highCriticality.id,
        },
        {
          workspaceId,
          fromTaskId: dependent2.id,
          toTaskId: highCriticality.id,
        },
      ],
    });

    const result = await nextAction(workspaceId);
    expect(result.kind).toBe("SELECTED");
    expect(result.kind === "SELECTED" && result.task.id).toBe(
      highCriticality.id
    );

    await database.task.deleteMany({
      where: {
        id: {
          in: [
            lowCriticality.id,
            highCriticality.id,
            dependent1.id,
            dependent2.id,
          ],
        },
      },
    });
  });

  test("a genuine tie (equal criticality, equal/no deadline) returns TIE", async () => {
    const taskA = await database.task.create({
      data: { workspaceId, title: "Tied A", state: "READY" },
    });
    const taskB = await database.task.create({
      data: { workspaceId, title: "Tied B", state: "READY" },
    });

    const result = await nextAction(workspaceId);
    expect(result.kind).toBe("TIE");
    expect(
      result.kind === "TIE" && result.candidates.map((t) => t.id).sort()
    ).toEqual([taskA.id, taskB.id].sort());

    await database.task.deleteMany({
      where: { id: { in: [taskA.id, taskB.id] } },
    });
  });
});
