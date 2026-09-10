import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { getWorkspaceEconomicSnapshot as GetWorkspaceEconomicSnapshot } from "../workspace-metrics";

describe.skipIf(!process.env.DATABASE_URL)(
  "getWorkspaceEconomicSnapshot (M15-T04)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let getWorkspaceEconomicSnapshot: typeof GetWorkspaceEconomicSnapshot;
    let workspaceId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ getWorkspaceEconomicSnapshot } = await import("../workspace-metrics"));

      const workspace = await database.workspace.create({
        data: {
          clerkOrgId: `org_metrics_test_${suffix}`,
          name: "Metrics Test",
        },
      });
      workspaceId = workspace.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("a workspace with no Subscription row has zero MRR and null contribution", async () => {
      const snapshot = await getWorkspaceEconomicSnapshot(
        workspaceId,
        new Date("2026-01-01"),
        new Date("2026-02-01")
      );
      expect(snapshot.plan).toBe("TRIAL");
      expect(snapshot.mrrCentavos).toBe(0);
      expect(snapshot.contributionBrl).toBeNull();
    });

    test("a Pro subscription contributes its real monthly price as MRR, minus real AI COGS in the period", async () => {
      await database.subscription.create({
        data: { workspaceId, plan: "PRO", status: "ACTIVE" },
      });
      const periodStart = new Date("2026-01-01");
      const periodEnd = new Date("2026-02-01");
      await database.aIUsage.create({
        data: {
          workspaceId,
          model: "gpt-4o-mini",
          inputTokens: 1000,
          outputTokens: 500,
          costBrl: 2.5,
          createdAt: new Date("2026-01-15"),
        },
      });

      const snapshot = await getWorkspaceEconomicSnapshot(
        workspaceId,
        periodStart,
        periodEnd
      );
      expect(snapshot.plan).toBe("PRO");
      expect(snapshot.mrrCentavos).toBe(8990); // PLAN_DEFINITIONS.PRO.monthlyPriceCentavos
      expect(snapshot.arrCentavos).toBe(8990 * 12);
      expect(snapshot.aiCogsBrl).toBe(2.5);
      expect(snapshot.contributionBrl).toBeCloseTo(89.9 - 2.5, 6);
    });
  }
);
