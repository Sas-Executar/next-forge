import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { runWorkflow as RunWorkflow } from "../src/executor";

describe.skipIf(!process.env.DATABASE_URL)("runWorkflow (M10-T05)", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let runWorkflow: typeof RunWorkflow;
  let workspaceId: string;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ runWorkflow } = await import("../src/executor"));

    const workspace = await database.workspace.create({
      data: {
        clerkOrgId: `org_automation_test_${suffix}`,
        name: "Automation Test",
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("create_task step creates a real Task and the run succeeds", async () => {
    const definition = await database.workflowDefinition.create({
      data: {
        workspaceId,
        name: `Create task workflow ${suffix}`,
        definition: {
          trigger: { type: "manual", schedule: null },
          steps: [
            {
              id: "s1",
              action: "create_task",
              params: { title: "From workflow" },
            },
          ],
        },
      },
    });

    const result = await runWorkflow(workspaceId, definition.id);
    expect(result.status).toBe("SUCCESS");
    expect(result.steps).toEqual([
      { stepId: "s1", action: "create_task", status: "OK", error: null },
    ]);

    const created = await database.task.findFirst({
      where: { workspaceId, title: "From workflow" },
    });
    expect(created).not.toBeNull();
  });

  test("a step with invalid params fails and stops the run — nothing after it executes", async () => {
    const definition = await database.workflowDefinition.create({
      data: {
        workspaceId,
        name: `Failing workflow ${suffix}`,
        definition: {
          trigger: { type: "manual", schedule: null },
          steps: [
            { id: "bad", action: "create_task", params: {} },
            {
              id: "unreachable",
              action: "notify",
              params: { message: "should not run" },
            },
          ],
        },
      },
    });

    const result = await runWorkflow(workspaceId, definition.id);
    expect(result.status).toBe("FAILED");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe("FAILED");

    const run = await database.workflowRun.findFirst({
      where: { workflowDefinitionId: definition.id },
    });
    expect(run?.status).toBe("FAILED");
  });
});
