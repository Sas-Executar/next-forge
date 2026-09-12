import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { McpToolContext } from "../src/context";
import type {
  ProjectNotFoundError as ProjectNotFoundErrorType,
  projectsCreate as ProjectsCreate,
  projectsGet as ProjectsGet,
  projectsList as ProjectsList,
} from "../src/tools/projects";

describe.skipIf(!process.env.DATABASE_URL)(
  "projects tools (M12-T02/T03)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let projectsCreate: typeof ProjectsCreate;
    let projectsGet: typeof ProjectsGet;
    let projectsList: typeof ProjectsList;
    let ProjectNotFoundError: typeof ProjectNotFoundErrorType;
    let workspaceId: string;
    let ctx: McpToolContext;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ projectsCreate, projectsGet, projectsList, ProjectNotFoundError } =
        await import("../src/tools/projects"));

      const workspace = await database.workspace.create({
        data: { clerkOrgId: `org_mcp_proj_${suffix}`, name: "MCP Proj Test" },
      });
      workspaceId = workspace.id;
      ctx = { workspaceId, actorRef: `user_mcp_proj_${suffix}` };
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("projects.create writes the row and a Project CREATE AuditEvent", async () => {
      const project = await projectsCreate(ctx, { name: `Project ${suffix}` });
      expect(project.workspaceId).toBe(workspaceId);

      const events = await database.auditEvent.findMany({
        where: { workspaceId, objectType: "Project", objectId: project.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].actorType).toBe("AGENT");
      expect(events[0].actorRef).toBe(ctx.actorRef);
      expect(events[0].authorityRuleId).toBe("mcp:projects.create");
    });

    test("projects.get finds an existing project and rejects a missing one", async () => {
      const created = await projectsCreate(ctx, {
        name: `Findable ${suffix}`,
      });
      const found = await projectsGet(ctx, { projectId: created.id });
      expect(found.id).toBe(created.id);

      await expect(
        projectsGet(ctx, { projectId: "does-not-exist" })
      ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    test("projects.list returns every project in the workspace", async () => {
      const before = await projectsList(ctx);
      await projectsCreate(ctx, { name: `Listed ${suffix}` });
      const after = await projectsList(ctx);
      expect(after.length).toBe(before.length + 1);
    });
  }
);
