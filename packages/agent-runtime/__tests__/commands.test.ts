import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { runAgora as RunAgora } from "../src/commands/agora";
import type { runBomdia as RunBomdia } from "../src/commands/bomdia";
import type { runEstado as RunEstado } from "../src/commands/estado";
import type { runFechardia as RunFechardia } from "../src/commands/fechardia";
import type {
  confirmReplan as ConfirmReplan,
  proposeReplan as ProposeReplan,
} from "../src/commands/replanejamento";
import { validateOrchestratorOutput } from "../src/output-schema";

/**
 * Exercises the real DB-backed commands against a live Postgres — same
 * skip/dynamic-import pattern as packages/database/__tests__/rls.test.ts
 * and packages/application/__tests__/next-action.test.ts (see those
 * files' doc comments for why the dynamic import is required, not
 * optional, alongside describe.skipIf).
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/agent-runtime).
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "Copiloto commands (M06-T03)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let runAgora: typeof RunAgora;
    let runEstado: typeof RunEstado;
    let runBomdia: typeof RunBomdia;
    let runFechardia: typeof RunFechardia;
    let proposeReplan: typeof ProposeReplan;
    let confirmReplan: typeof ConfirmReplan;
    let workspaceId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ runAgora } = await import("../src/commands/agora"));
      ({ runEstado } = await import("../src/commands/estado"));
      ({ runBomdia } = await import("../src/commands/bomdia"));
      ({ runFechardia } = await import("../src/commands/fechardia"));
      ({ proposeReplan, confirmReplan } = await import(
        "../src/commands/replanejamento"
      ));

      const workspace = await database.workspace.create({
        data: {
          clerkOrgId: `org_agent_runtime_test_${suffix}`,
          name: "Agent Runtime Test",
        },
      });
      workspaceId = workspace.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("every read command's output validates against the orchestrator-output contract on an empty workspace", async () => {
      const outputs = [
        await runAgora(workspaceId),
        await runEstado(workspaceId),
        await runBomdia(workspaceId),
        await runFechardia(workspaceId),
      ];
      for (const output of outputs) {
        expect(() => validateOrchestratorOutput(output)).not.toThrow();
      }
      // An empty workspace has nothing eligible and nothing to close.
      expect(outputs[0].status).toBe("BLOQUEADO"); // agora
      expect(outputs[2].status).toBe("BLOQUEADO"); // bomdia
      expect(outputs[3].status).toBe("BLOQUEADO"); // fechardia
    });

    test("PRE_APPROVE gate: proposeReplan never writes, confirmReplan does", async () => {
      const proposal = {
        deliverableTitle: `Gate test ${suffix}`,
        tasks: [{ title: "Task A" }, { title: "Task B" }],
      };

      const countBefore = await database.deliverable.count({
        where: { workspaceId },
      });

      const proposed = proposeReplan(proposal);
      expect(() => validateOrchestratorOutput(proposed)).not.toThrow();
      expect(proposed.status).toBe("CONDICIONAL");
      expect(proposed.write_policy.allowed).toBe(false);
      expect(proposed.write_policy.requires_human_confirmation).toBe(true);
      expect(proposed.ui.mermaid).toContain(proposal.deliverableTitle);

      const countAfterPropose = await database.deliverable.count({
        where: { workspaceId },
      });
      expect(countAfterPropose).toBe(countBefore);

      const confirmed = await confirmReplan(
        workspaceId,
        proposal,
        `test-user-${suffix}`
      );
      expect(() => validateOrchestratorOutput(confirmed)).not.toThrow();
      expect(confirmed.status).toBe("OK");
      expect(confirmed.write_policy.allowed).toBe(true);

      const countAfterConfirm = await database.deliverable.count({
        where: { workspaceId },
      });
      expect(countAfterConfirm).toBe(countBefore + 1);

      const createdTasks = await database.task.count({
        where: {
          workspaceId,
          deliverable: { title: proposal.deliverableTitle },
        },
      });
      expect(createdTasks).toBe(2);

      const auditEvent = await database.auditEvent.findFirst({
        where: { workspaceId, action: "PLAN_DECOMPOSED" },
      });
      expect(auditEvent?.actorType).toBe("AGENT");
    });

    test("fechardia never sets write_policy.allowed on a task pending human confirmation", async () => {
      const project = await database.project.create({
        data: { workspaceId, name: `Fechardia test ${suffix}` },
      });
      const task = await database.task.create({
        data: {
          workspaceId,
          projectId: project.id,
          title: "In progress task",
          state: "DOING",
        },
      });

      const output = await runFechardia(workspaceId);
      expect(() => validateOrchestratorOutput(output)).not.toThrow();
      expect(output.write_policy.allowed).toBe(false);
      expect(output.write_policy.requires_human_confirmation).toBe(true);
      expect(output.state_transition?.object_id).toBe(task.id);
      expect(output.state_transition?.to).toBe("VERIFY");
    });
  }
);
