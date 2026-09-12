import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { database as Database } from "../index";
import type { forWorkspace as ForWorkspace } from "../rls";

type ScopedClient = ReturnType<typeof ForWorkspace>;

/**
 * Structural subset of every Prisma model delegate this suite needs
 * (`findMany`/`findUnique`/`create`), used only to drive the generic,
 * data-driven loop below across all 28 workspace-scoped models — each of
 * which has its own specific Prisma input/output types that a single
 * shared loop can't reference directly. The cast lives in exactly one
 * place (`asIsolationDelegate`); every entry in `MODEL_CASES` still goes
 * through the real, generated delegate (`client.task`, `client.routine`,
 * …), so a rename or removed field there still breaks this file at
 * compile time — only the *shape* checked here is loosened, not which
 * delegate is invoked.
 */
interface IsolationDelegate {
  readonly create: (args: {
    data: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  readonly findMany: () => Promise<Array<{ id: string }>>;
  readonly findUnique: (args: {
    where: { id: string };
  }) => Promise<{ id: string } | null>;
}

const asIsolationDelegate = (delegate: unknown): IsolationDelegate =>
  delegate as IsolationDelegate;

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
  "Row Level Security (M03-T03, expanded M16-T02)",
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

    /**
     * M16-T02 — the suite above only ever proved RLS for Workspace and
     * Task. `20260909173722_enable_rls` gives every one of the 28
     * workspace-scoped tables the exact same `workspace_isolation`
     * policy (`USING`/`WITH CHECK` on `"workspaceId" =
     * current_setting('app.current_workspace_id', true)`), plus
     * `TelemetryEvent` (added in `20260910105939_telemetry_events`,
     * same policy shape). This block builds one real, FK-valid row per
     * model in each of two workspaces and generically re-runs the two
     * cheapest, highest-signal checks from the hand-written Task suite
     * above (cross-tenant visibility, cross-tenant insert) against every
     * one of them — instead of 28 near-identical hand-written blocks.
     *
     * Cross-tenant UPDATE is deliberately not repeated per model here:
     * it shares the exact same `USING` clause as the read/insert checks
     * already exercised per-model below, and the hand-written Task test
     * above already proves that mechanism end-to-end (a blocked UPDATE
     * really does leave the row untouched, not just rejected) — a
     * mechanically identical per-model repeat of that specific assertion
     * would not catch a class of bug the other two checks wouldn't
     * already catch first.
     */
    describe("cross-workspace isolation across every workspace-scoped model", () => {
      interface WorkspaceFixtures {
        readonly action: { id: string };
        readonly agentRun: { id: string };
        readonly aiUsage: { id: string };
        readonly attachment: { id: string };
        readonly auditEvent: { id: string };
        readonly deliverable: { id: string };
        readonly dependency: { id: string };
        readonly evidence: { id: string };
        readonly executionCredit: { id: string };
        readonly externalObjectRef: { id: string };
        readonly integrationConnection: { id: string };
        readonly mapaOS: { id: string };
        readonly membership: { id: string };
        readonly notification: { id: string };
        readonly process: { id: string };
        readonly project: { id: string };
        readonly routine: { id: string };
        readonly routineRun: { id: string };
        readonly scannerMutation: { id: string };
        readonly statusReport: { id: string };
        readonly subscription: { id: string };
        readonly task: { id: string };
        readonly task2: { id: string };
        readonly telemetryEvent: { id: string };
        readonly toolCall: { id: string };
        readonly usageLedger: { id: string };
        readonly visualSymbol: { id: string };
        readonly workflowDefinition: { id: string };
        readonly workflowRun: { id: string };
        readonly workspaceId: string;
      }

      let fxA: WorkspaceFixtures;
      let fxB: WorkspaceFixtures;

      /**
       * Builds one real row per workspace-scoped model, in FK dependency
       * order, all owned by `workspaceId` — via the unscoped `database`
       * export (fixture setup, same as the outer `beforeAll`).
       */
      const buildFixtures = async (
        workspaceId: string,
        label: string
      ): Promise<WorkspaceFixtures> => {
        const membership = await database.membership.create({
          data: { workspaceId, clerkUserId: `user_rls_${suffix}_${label}` },
        });
        const project = await database.project.create({
          data: { workspaceId, name: `RLS Project ${label}` },
        });
        const process = await database.process.create({
          data: {
            workspaceId,
            projectId: project.id,
            name: `RLS Process ${label}`,
          },
        });
        const deliverable = await database.deliverable.create({
          data: {
            workspaceId,
            projectId: project.id,
            processId: process.id,
            title: `RLS Deliverable ${label}`,
          },
        });
        const task = await database.task.create({
          data: {
            workspaceId,
            projectId: project.id,
            processId: process.id,
            deliverableId: deliverable.id,
            title: `RLS Task ${label}`,
          },
        });
        const task2 = await database.task.create({
          data: { workspaceId, title: `RLS Task 2 ${label}` },
        });
        const action = await database.action.create({
          data: { workspaceId, taskId: task.id, title: `RLS Action ${label}` },
        });
        const evidence = await database.evidence.create({
          data: {
            workspaceId,
            taskId: task.id,
            grade: "A_OBSERVADO",
            description: `RLS Evidence ${label}`,
          },
        });
        const dependency = await database.dependency.create({
          data: { workspaceId, fromTaskId: task.id, toTaskId: task2.id },
        });
        const routine = await database.routine.create({
          data: { workspaceId, name: `RLS Routine ${label}`, config: {} },
        });
        const routineRun = await database.routineRun.create({
          data: {
            workspaceId,
            routineId: routine.id,
            runKey: `rls_${suffix}_${label}`,
          },
        });
        const workflowDefinition = await database.workflowDefinition.create({
          data: { workspaceId, name: `RLS Workflow ${label}`, definition: {} },
        });
        const workflowRun = await database.workflowRun.create({
          data: { workspaceId, workflowDefinitionId: workflowDefinition.id },
        });
        const statusReport = await database.statusReport.create({
          data: {
            workspaceId,
            projectId: project.id,
            status: "OK",
            progress: {},
            triptych: {},
            properties: {},
          },
        });
        const mapaOS = await database.mapaOS.create({
          data: { workspaceId, projectId: project.id },
        });
        const visualSymbol = await database.visualSymbol.create({
          data: {
            workspaceId,
            symbolId: `SYM-RLS-${suffix}-${label}`,
            semantic: "DONE",
            command: "COMPLETE_LATEST_OPEN_TASK",
          },
        });
        const scannerMutation = await database.scannerMutation.create({
          data: {
            workspaceId,
            visualSymbolId: visualSymbol.id,
            taskId: task.id,
          },
        });
        const attachment = await database.attachment.create({
          data: {
            workspaceId,
            taskId: task.id,
            url: `https://example.com/rls-${suffix}-${label}`,
            filename: `rls-${label}.txt`,
          },
        });
        const integrationConnection =
          await database.integrationConnection.create({
            data: { workspaceId, provider: "WHATSAPP" },
          });
        const externalObjectRef = await database.externalObjectRef.create({
          data: {
            workspaceId,
            integrationConnectionId: integrationConnection.id,
            externalId: `ext_${suffix}_${label}`,
            externalObjectType: "Message",
            canonicalObjectType: "Task",
            canonicalObjectId: task.id,
          },
        });
        const agentRun = await database.agentRun.create({
          data: { workspaceId, phase: "EXECUTE", input: {} },
        });
        const toolCall = await database.toolCall.create({
          data: {
            workspaceId,
            agentRunId: agentRun.id,
            toolName: "rls.probe",
            input: {},
          },
        });
        const aiUsage = await database.aIUsage.create({
          data: {
            workspaceId,
            model: "gpt-4o-mini",
            inputTokens: 1,
            outputTokens: 1,
          },
        });
        const notification = await database.notification.create({
          data: {
            workspaceId,
            recipientRef: `rls_${label}`,
            channel: "APP_REPORTS",
            payload: {},
          },
        });
        const subscription = await database.subscription.create({
          data: { workspaceId },
        });
        const now = new Date();
        const usageLedger = await database.usageLedger.create({
          data: {
            workspaceId,
            category: "AI",
            amount: 1,
            unit: "credits",
            periodStart: now,
            periodEnd: now,
          },
        });
        const executionCredit = await database.executionCredit.create({
          data: { workspaceId, amount: 1, reason: "rls-fixture" },
        });
        const auditEvent = await database.auditEvent.create({
          data: {
            workspaceId,
            actorType: "SYSTEM",
            action: "rls.probe",
            objectType: "Task",
            objectId: task.id,
          },
        });
        const telemetryEvent = await database.telemetryEvent.create({
          data: {
            workspaceId,
            traceId: `trace_${suffix}_${label}`,
            eventName: "product.rls_probe",
            component: "rls-test",
            outcome: "success",
          },
        });

        return {
          action,
          agentRun,
          aiUsage,
          attachment,
          auditEvent,
          deliverable,
          dependency,
          evidence,
          executionCredit,
          externalObjectRef,
          integrationConnection,
          mapaOS,
          membership,
          notification,
          process,
          project,
          routine,
          routineRun,
          scannerMutation,
          statusReport,
          subscription,
          task,
          task2,
          telemetryEvent,
          toolCall,
          usageLedger,
          visualSymbol,
          workflowDefinition,
          workflowRun,
          workspaceId,
        };
      };

      beforeAll(async () => {
        fxA = await buildFixtures(workspaceA.id, "a");
        fxB = await buildFixtures(workspaceB.id, "b");
      });

      /**
       * One entry per workspace-scoped model not already covered above.
       * `rowId` picks the fixture row's id for the read/visibility
       * checks; `rejectionData` builds a structurally valid row (real
       * FKs, fresh unique keys so no unrelated unique-constraint
       * collision masks the result) but with `workspaceId` pointed at
       * the *other* workspace — the only reason Postgres has left to
       * reject it is the WITH CHECK clause.
       *
       * `Subscription` is the one case where a second rejection reason
       * (its own `@unique workspaceId`) is also true — the target
       * workspace already has a Subscription row from its own fixtures.
       * Whichever constraint Postgres reports first, both correctly deny
       * the cross-tenant write, so the assertion (`rejects.toThrow()`)
       * still holds.
       */
      const MODEL_CASES: ReadonlyArray<{
        readonly delegate: (client: ScopedClient) => unknown;
        readonly name: string;
        readonly rejectionData: (
          fx: WorkspaceFixtures,
          otherWorkspaceId: string
        ) => Record<string, unknown>;
        readonly rowId: (fx: WorkspaceFixtures) => string;
      }> = [
        {
          name: "membership",
          delegate: (c) => c.membership,
          rowId: (fx) => fx.membership.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            clerkUserId: `user_rls_${suffix}_reject_${fx.workspaceId}`,
          }),
        },
        {
          name: "project",
          delegate: (c) => c.project,
          rowId: (fx) => fx.project.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            name: "RLS reject project",
          }),
        },
        {
          name: "process",
          delegate: (c) => c.process,
          rowId: (fx) => fx.process.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            projectId: fx.project.id,
            name: "RLS reject process",
          }),
        },
        {
          name: "deliverable",
          delegate: (c) => c.deliverable,
          rowId: (fx) => fx.deliverable.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            projectId: fx.project.id,
            title: "RLS reject deliverable",
          }),
        },
        {
          name: "task",
          delegate: (c) => c.task,
          rowId: (fx) => fx.task.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            title: "RLS reject task",
          }),
        },
        {
          name: "action",
          delegate: (c) => c.action,
          rowId: (fx) => fx.action.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            taskId: fx.task.id,
            title: "RLS reject action",
          }),
        },
        {
          name: "evidence",
          delegate: (c) => c.evidence,
          rowId: (fx) => fx.evidence.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            taskId: fx.task.id,
            grade: "A_OBSERVADO",
            description: "RLS reject evidence",
          }),
        },
        {
          name: "dependency",
          delegate: (c) => c.dependency,
          rowId: (fx) => fx.dependency.id,
          // Reversed pair vs. the fixture's own (task→task2) so the
          // unique([fromTaskId, toTaskId]) constraint can't also explain
          // the rejection.
          rejectionData: (fx, other) => ({
            workspaceId: other,
            fromTaskId: fx.task2.id,
            toTaskId: fx.task.id,
          }),
        },
        {
          name: "routine",
          delegate: (c) => c.routine,
          rowId: (fx) => fx.routine.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            name: "RLS reject routine",
            config: {},
          }),
        },
        {
          name: "routineRun",
          delegate: (c) => c.routineRun,
          rowId: (fx) => fx.routineRun.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            routineId: fx.routine.id,
            runKey: `rls_${suffix}_reject_routineRun`,
          }),
        },
        {
          name: "workflowDefinition",
          delegate: (c) => c.workflowDefinition,
          rowId: (fx) => fx.workflowDefinition.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            name: "RLS reject workflow",
            definition: {},
          }),
        },
        {
          name: "workflowRun",
          delegate: (c) => c.workflowRun,
          rowId: (fx) => fx.workflowRun.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            workflowDefinitionId: fx.workflowDefinition.id,
          }),
        },
        {
          name: "statusReport",
          delegate: (c) => c.statusReport,
          rowId: (fx) => fx.statusReport.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            status: "OK",
            progress: {},
            triptych: {},
            properties: {},
          }),
        },
        {
          name: "mapaOS",
          delegate: (c) => c.mapaOS,
          rowId: (fx) => fx.mapaOS.id,
          rejectionData: (_fx, other) => ({ workspaceId: other }),
        },
        {
          name: "visualSymbol",
          delegate: (c) => c.visualSymbol,
          rowId: (fx) => fx.visualSymbol.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            symbolId: `SYM-RLS-${suffix}-reject`,
            semantic: "DONE",
            command: "COMPLETE_LATEST_OPEN_TASK",
          }),
        },
        {
          name: "scannerMutation",
          delegate: (c) => c.scannerMutation,
          rowId: (fx) => fx.scannerMutation.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            visualSymbolId: fx.visualSymbol.id,
          }),
        },
        {
          name: "attachment",
          delegate: (c) => c.attachment,
          rowId: (fx) => fx.attachment.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            url: `https://example.com/rls-${suffix}-reject`,
            filename: "rls-reject.txt",
          }),
        },
        {
          name: "integrationConnection",
          delegate: (c) => c.integrationConnection,
          rowId: (fx) => fx.integrationConnection.id,
          // Different provider than the fixture's own WHATSAPP so
          // unique([workspaceId, provider]) can't also explain it.
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            provider: "GMAIL",
          }),
        },
        {
          name: "externalObjectRef",
          delegate: (c) => c.externalObjectRef,
          rowId: (fx) => fx.externalObjectRef.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            integrationConnectionId: fx.integrationConnection.id,
            externalId: `ext_${suffix}_reject`,
            externalObjectType: "Message",
            canonicalObjectType: "Task",
            canonicalObjectId: fx.task.id,
          }),
        },
        {
          name: "agentRun",
          delegate: (c) => c.agentRun,
          rowId: (fx) => fx.agentRun.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            phase: "EXECUTE",
            input: {},
          }),
        },
        {
          name: "toolCall",
          delegate: (c) => c.toolCall,
          rowId: (fx) => fx.toolCall.id,
          rejectionData: (fx, other) => ({
            workspaceId: other,
            agentRunId: fx.agentRun.id,
            toolName: "rls.reject",
            input: {},
          }),
        },
        {
          name: "aiUsage",
          delegate: (c) => c.aIUsage,
          rowId: (fx) => fx.aiUsage.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            model: "gpt-4o-mini",
            inputTokens: 1,
            outputTokens: 1,
          }),
        },
        {
          name: "notification",
          delegate: (c) => c.notification,
          rowId: (fx) => fx.notification.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            recipientRef: "rls-reject",
            channel: "APP_REPORTS",
            payload: {},
          }),
        },
        {
          name: "subscription",
          delegate: (c) => c.subscription,
          rowId: (fx) => fx.subscription.id,
          rejectionData: (_fx, other) => ({ workspaceId: other }),
        },
        {
          name: "usageLedger",
          delegate: (c) => c.usageLedger,
          rowId: (fx) => fx.usageLedger.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            category: "AI",
            amount: 1,
            unit: "credits",
            periodStart: new Date(),
            periodEnd: new Date(),
          }),
        },
        {
          name: "executionCredit",
          delegate: (c) => c.executionCredit,
          rowId: (fx) => fx.executionCredit.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            amount: 1,
            reason: "rls-reject",
          }),
        },
        {
          name: "auditEvent",
          delegate: (c) => c.auditEvent,
          rowId: (fx) => fx.auditEvent.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            actorType: "SYSTEM",
            action: "rls.reject",
            objectType: "Task",
          }),
        },
        {
          name: "telemetryEvent",
          delegate: (c) => c.telemetryEvent,
          rowId: (fx) => fx.telemetryEvent.id,
          rejectionData: (_fx, other) => ({
            workspaceId: other,
            traceId: `trace_${suffix}_reject`,
            eventName: "product.rls_probe_reject",
            component: "rls-test",
            outcome: "success",
          }),
        },
      ];

      for (const modelCase of MODEL_CASES) {
        describe(modelCase.name, () => {
          test("a workspace-scoped client cannot see the other workspace's row", async () => {
            const dbA = asIsolationDelegate(
              modelCase.delegate(forWorkspace(workspaceA.id))
            );
            const visible = await dbA.findMany();
            const ids = visible.map((row) => row.id);
            expect(ids).toContain(modelCase.rowId(fxA));
            expect(ids).not.toContain(modelCase.rowId(fxB));
          });

          test("cross-workspace read by id returns nothing", async () => {
            const dbA = asIsolationDelegate(
              modelCase.delegate(forWorkspace(workspaceA.id))
            );
            const found = await dbA.findUnique({
              where: { id: modelCase.rowId(fxB) },
            });
            expect(found).toBeNull();
          });

          test("WITH CHECK rejects inserting a row into a different workspace", async () => {
            const dbA = asIsolationDelegate(
              modelCase.delegate(forWorkspace(workspaceA.id))
            );
            await expect(
              dbA.create({ data: modelCase.rejectionData(fxA, workspaceB.id) })
            ).rejects.toThrow();
          });
        });
      }
    });
  }
);
