import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type {
  consumeCredits as ConsumeCredits,
  getCreditBalance as GetCreditBalance,
  grantCredits as GrantCredits,
} from "../src/credits";

/**
 * Exercises the real ExecutionCredit ledger against a live Postgres —
 * same skip/dynamic-import pattern as every other DB-gated suite in
 * this repo. Run manually with: `DATABASE_URL=... bun run test`
 * (packages/billing).
 */
describe.skipIf(!process.env.DATABASE_URL)("credits ledger (M13-T03)", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let grantCredits: typeof GrantCredits;
  let consumeCredits: typeof ConsumeCredits;
  let getCreditBalance: typeof GetCreditBalance;
  let workspaceId: string;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ grantCredits, consumeCredits, getCreditBalance } = await import(
      "../src/credits"
    ));

    const workspace = await database.workspace.create({
      data: { clerkOrgId: `org_billing_test_${suffix}`, name: "Billing Test" },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("balance starts at 0 and reflects grants", async () => {
    expect(await getCreditBalance(workspaceId)).toBe(0);
    await grantCredits(workspaceId, 100, "PLAN_ALLOWANCE");
    expect(await getCreditBalance(workspaceId)).toBe(100);
  });

  test("consuming within balance succeeds and records balanceAfter", async () => {
    const result = await consumeCredits(workspaceId, 30, "AI_USAGE");
    expect(result.status).toBe("OK");
    expect(await getCreditBalance(workspaceId)).toBe(70);
  });

  test("consuming more than the balance is INSUFFICIENT, never silently negative", async () => {
    const result = await consumeCredits(workspaceId, 1000, "AI_USAGE");
    expect(result).toEqual({
      status: "INSUFFICIENT",
      balance: 70,
      requested: 1000,
    });
    // Balance unchanged — no row was written for the rejected consumption.
    expect(await getCreditBalance(workspaceId)).toBe(70);
  });
});
