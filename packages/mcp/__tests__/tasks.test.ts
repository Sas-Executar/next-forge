import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { McpToolContext } from "../src/context";
import type {
  tasksCreate as TasksCreate,
  tasksUpdate as TasksUpdate,
} from "../src/tools/tasks";

/**
 * Exercises this package's own tool-layer behavior against a live
 * Postgres — same skip/dynamic-import pattern as every other DB-gated
 * suite in this repo. The business logic these tools wrap
 * (canTransitionTask, the eligibility/next-action functions) already
 * has its own coverage elsewhere (packages/domain, packages/
 * application) — this suite's job is proving the MCP tool layer wires
 * it correctly, in particular the one behavior that's new in this
 * milestone: an `actor: "AGENT"` caller (every MCP client) is never
 * auto-allowed into DOING/VERIFY/DONE (M12-T03, tasks.ts's own comment).
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/mcp).
 */
describe.skipIf(!process.env.DATABASE_URL)("tasks tools (M12-T02/T03)", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let tasksCreate: typeof TasksCreate;
  let tasksUpdate: typeof TasksUpdate;
  let workspaceId: string;
  let ctx: McpToolContext;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ tasksCreate, tasksUpdate } = await import("../src/tools/tasks"));

    const workspace = await database.workspace.create({
      data: { clerkOrgId: `org_mcp_test_${suffix}`, name: "MCP Test" },
    });
    workspaceId = workspace.id;
    ctx = { workspaceId, actorRef: `user_mcp_test_${suffix}` };
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("tasks.create promotes a new task straight to READY, authorized as AGENT", async () => {
    const task = await tasksCreate(ctx, { title: `Task ${suffix}` });
    expect(task.state).toBe("READY");
    expect(task.workspaceId).toBe(workspaceId);
  });

  test("tasks.update to DOING is HUMAN_REQUIRED for an MCP (AGENT) caller", async () => {
    const task = await tasksCreate(ctx, { title: `DOING task ${suffix}` });
    const result = await tasksUpdate(ctx, {
      taskId: task.id,
      toState: "DOING",
    });
    expect(result.status).toBe("HUMAN_REQUIRED");

    const reloaded = await database.task.findUnique({
      where: { id: task.id },
    });
    expect(reloaded?.state).toBe("READY");
  });

  test("tasks.update to DONE is HUMAN_REQUIRED even from VERIFY (structurally legal, but AGENT never auto-completes)", async () => {
    const task = await tasksCreate(ctx, { title: `DONE task ${suffix}` });
    // Force the task to VERIFY first, as a real USER actor would via
    // the web app — this suite is about the MCP tool layer's own
    // AGENT-actor guard, not re-testing canTransitionTask's full state
    // machine (packages/domain already covers that).
    await database.task.update({
      where: { id: task.id },
      data: { state: "VERIFY" },
    });

    // Disclosed consequence of using actor "AGENT" for every MCP call
    // (context.ts's own comment): VERIFY -> DONE is structurally legal,
    // so this exercises the AuthorityGate branch specifically, not the
    // structural-legality one test 4 below covers — but since AGENT
    // never auto-completes a task, tasks.update's MISSING_EVIDENCE
    // branch (mirroring complete-action.ts's "'feito' não substitui
    // evidência" invariant) is unreachable from an MCP caller today: DONE
    // always requires a human either way. Not tested here as a separate
    // case because there is no real path to it through this tool.
    const result = await tasksUpdate(ctx, {
      taskId: task.id,
      toState: "DONE",
    });
    expect(result.status).toBe("HUMAN_REQUIRED");
  });

  test("tasks.update to an illegal structural transition is BLOCKED_TRANSITION", async () => {
    const task = await tasksCreate(ctx, { title: `Illegal task ${suffix}` });
    const result = await tasksUpdate(ctx, {
      taskId: task.id,
      // READY -> DONE skips DOING/VERIFY: structurally illegal per
      // TASK_STATE_TRANSITIONS (packages/schemas).
      toState: "DONE",
    });
    expect(result.status).toBe("BLOCKED_TRANSITION");
  });

  test("tasks.update BLOCKED is allowed even for an AGENT caller", async () => {
    const task = await tasksCreate(ctx, { title: `Block task ${suffix}` });
    const result = await tasksUpdate(ctx, {
      taskId: task.id,
      toState: "BLOCKED",
    });
    expect(result.status).toBe("OK");
  });
});
