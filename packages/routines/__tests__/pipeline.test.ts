import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { runRoutine as RunRoutine } from "../src/pipeline";

const baseConfig = (
  sources: {
    source_id: string;
    provider: string;
    role: string;
    required: boolean;
  }[]
) => ({
  scope: { project_id: null },
  trigger: {
    type: "schedule",
    schedule: "0 9 * * *",
    timezone: "America/Sao_Paulo",
  },
  sources,
  execution_policy: {
    wip_limit: 1,
    eligibility_policy: "dependencies_first",
    tie_policy: "human_escalation",
    allowed_mutations: ["sync_mirror", "promote_ready"],
    blocked_mutations: ["start", "verify", "complete", "publish"],
  },
  report: {
    template_id: "DELIV-STATUS-ROUTINE-001",
    schema: "EXECUTAR_ROUTINE_STATUS_V1",
  },
  delivery: [{ channel: "app_reports", enabled: true }],
  retry: { max_attempts: 3, backoff: "exponential" },
});

/**
 * Exercises the real DB-backed pipeline against a live Postgres — same
 * skip/dynamic-import pattern as every other DB-gated suite in this
 * repo. Covers M10's two DoD scenarios directly:
 *  - "duplicate-slot execution test passes" (§12, §9)
 *  - "a blocked required source produces BLOCKED with zero mutations" (§5, §12)
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/routines).
 */
describe.skipIf(!process.env.DATABASE_URL)("runRoutine (M10-T02)", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let runRoutine: typeof RunRoutine;
  let workspaceId: string;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ runRoutine } = await import("../src/pipeline"));

    const workspace = await database.workspace.create({
      data: {
        clerkOrgId: `org_routines_test_${suffix}`,
        name: "Routines Test",
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("a required non-internal source blocks the run with zero mutations", async () => {
    const routine = await database.routine.create({
      data: {
        workspaceId,
        name: `Blocked routine ${suffix}`,
        status: "ENABLED",
        config: baseConfig([
          {
            source_id: "src-whatsapp",
            provider: "whatsapp",
            role: "evidence",
            required: true,
          },
        ]),
      },
    });

    const result = await runRoutine(workspaceId, routine.id, "slot-blocked-1");
    expect(result.status).toBe("BLOCKED");
    expect(result.blockReason).toContain("src-whatsapp");
    expect(result.mutations).toEqual([]);

    const run = await database.routineRun.findUnique({
      where: { id: result.runId },
    });
    expect(run?.status).toBe("BLOCKED");
  });

  test("running the same scheduled slot twice produces exactly one RoutineRun", async () => {
    const routine = await database.routine.create({
      data: {
        workspaceId,
        name: `Dedup routine ${suffix}`,
        status: "ENABLED",
        config: baseConfig([
          {
            source_id: "src-internal",
            provider: "internal",
            role: "state_authority",
            required: true,
          },
        ]),
      },
    });

    const slot = "2026-09-10T09:00:00Z";
    const first = await runRoutine(workspaceId, routine.id, slot);
    const second = await runRoutine(workspaceId, routine.id, slot);

    expect(first.runId).toBe(second.runId);
    expect(second.deduplicated).toBe(true);
    expect(first.deduplicated).toBe(false);

    const runs = await database.routineRun.findMany({
      where: { routineId: routine.id },
    });
    expect(runs).toHaveLength(1);
  });

  test("auto-promotes a BACKLOG_VALIDATED task whose dependencies are all DONE, leaves a still-blocked one alone", async () => {
    const project = await database.project.create({
      data: { workspaceId, name: `Promote test ${suffix}` },
    });
    const doneDependency = await database.task.create({
      data: {
        workspaceId,
        projectId: project.id,
        title: "Done dep",
        state: "DONE",
      },
    });
    const pendingDependency = await database.task.create({
      data: {
        workspaceId,
        projectId: project.id,
        title: "Pending dep",
        state: "BACKLOG_VALIDATED",
      },
    });
    const promotable = await database.task.create({
      data: {
        workspaceId,
        projectId: project.id,
        title: "Promotable",
        state: "BACKLOG_VALIDATED",
      },
    });
    const notPromotable = await database.task.create({
      data: {
        workspaceId,
        projectId: project.id,
        title: "Not promotable",
        state: "BACKLOG_VALIDATED",
      },
    });
    await database.dependency.create({
      data: {
        workspaceId,
        fromTaskId: promotable.id,
        toTaskId: doneDependency.id,
      },
    });
    await database.dependency.create({
      data: {
        workspaceId,
        fromTaskId: notPromotable.id,
        toTaskId: pendingDependency.id,
      },
    });

    const routine = await database.routine.create({
      data: {
        workspaceId,
        name: `Promote routine ${suffix}`,
        status: "ENABLED",
        config: baseConfig([
          {
            source_id: "src-internal",
            provider: "internal",
            role: "state_authority",
            required: true,
          },
        ]),
      },
    });

    const result = await runRoutine(workspaceId, routine.id, "slot-promote-1");
    expect(result.status).toBe("SUCCESS");
    expect(result.mutations).toEqual([
      {
        object_id: promotable.id,
        from: "BACKLOG_VALIDATED",
        to: "READY",
        authority_rule_id: "SPEC-ROUTINES-001:§7:BACKLOG_VALIDATED->READY",
        evidence_refs: [],
      },
    ]);

    const updatedPromotable = await database.task.findUnique({
      where: { id: promotable.id },
    });
    const updatedNotPromotable = await database.task.findUnique({
      where: { id: notPromotable.id },
    });
    expect(updatedPromotable?.state).toBe("READY");
    expect(updatedNotPromotable?.state).toBe("BACKLOG_VALIDATED");
  });
});
