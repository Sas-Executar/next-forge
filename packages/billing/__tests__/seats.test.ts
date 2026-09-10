import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type {
  canAddMember as CanAddMember,
  getSeatUsage as GetSeatUsage,
} from "../src/seats";

describe.skipIf(!process.env.DATABASE_URL)("seats (M13-T05)", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let getSeatUsage: typeof GetSeatUsage;
  let canAddMember: typeof CanAddMember;
  let workspaceId: string;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ getSeatUsage, canAddMember } = await import("../src/seats"));

    const workspace = await database.workspace.create({
      data: { clerkOrgId: `org_seats_test_${suffix}`, name: "Seats Test" },
    });
    workspaceId = workspace.id;
    await database.membership.create({
      data: { workspaceId, clerkUserId: `user_1_${suffix}`, role: "OWNER" },
    });
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("a workspace with no Subscription row defaults to TRIAL's 1-seat capacity", async () => {
    const usage = await getSeatUsage(workspaceId);
    expect(usage.includedSeats).toBe(1);
    expect(usage.activeMembers).toBe(1);
    expect(usage.seatsRemaining).toBe(0);
    expect(await canAddMember(workspaceId)).toBe(false);
  });

  test("Business plan with purchased seats raises total capacity", async () => {
    await database.subscription.create({
      data: { workspaceId, plan: "BUSINESS", purchasedSeats: 2 },
    });
    const usage = await getSeatUsage(workspaceId);
    // 5 included + 2 purchased = 7, minus 1 active member.
    expect(usage.totalCapacity).toBe(7);
    expect(usage.seatsRemaining).toBe(6);
    expect(await canAddMember(workspaceId)).toBe(true);
  });

  test("Enterprise has no fixed capacity — never invents a cap", async () => {
    await database.subscription.update({
      where: { workspaceId },
      data: { plan: "ENTERPRISE" },
    });
    const usage = await getSeatUsage(workspaceId);
    expect(usage.totalCapacity).toBeNull();
    expect(usage.seatsRemaining).toBeNull();
    expect(await canAddMember(workspaceId)).toBe(true);
  });
});
