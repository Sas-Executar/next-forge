import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { getWorkspaceEntitlements as GetWorkspaceEntitlements } from "../src/workspace-entitlements";

describe.skipIf(!process.env.DATABASE_URL)(
  "getWorkspaceEntitlements (M13-T02)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let getWorkspaceEntitlements: typeof GetWorkspaceEntitlements;
    let workspaceId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ getWorkspaceEntitlements } = await import(
        "../src/workspace-entitlements"
      ));

      const workspace = await database.workspace.create({
        data: { clerkOrgId: `org_ent_test_${suffix}`, name: "Ent Test" },
      });
      workspaceId = workspace.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("defaults to TRIAL entitlements when no Subscription row exists", async () => {
      const entitlements = await getWorkspaceEntitlements(workspaceId);
      expect(entitlements.plan).toBe("TRIAL");
      expect(entitlements.routines).toBe(false);
    });

    test("reflects the real Subscription.plan once one exists", async () => {
      await database.subscription.create({
        data: { workspaceId, plan: "PRO" },
      });
      const entitlements = await getWorkspaceEntitlements(workspaceId);
      expect(entitlements.plan).toBe("PRO");
      expect(entitlements.routines).toBe(true);
      expect(entitlements.mcp).toBe(true);
    });
  }
);
