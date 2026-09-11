import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type {
  buildCopilotMcpServer as BuildCopilotMcpServer,
  buildCopilotToolDefinitions as BuildCopilotToolDefinitions,
  COPILOT_MCP_TOOL_NAMES as CopilotMcpToolNames,
} from "../src/mcp-tools";
import type { validateOrchestratorOutput as ValidateOrchestratorOutput } from "../src/output-schema";

const QUALIFIED_TOOL_NAME_PATTERN = /^mcp__executar-copiloto__/;

/**
 * Fase 2 (D2/ADR-004) — buildCopilotMcpServer()/buildCopilotToolDefinitions()
 * are the Agent-SDK-native equivalent of buildCopilotTools() (tools.ts,
 * untouched — it serves apps/app's /api/chat, out of this migration's
 * scope per ADR-004).
 *
 * Unlike ativacao.test.ts (pure Zod, no DB), mcp-tools.ts imports
 * ./commands, which imports @repo/database — and @repo/database/index.ts
 * calls keys() (DATABASE_URL env validation) at module top level, so
 * ANY static import of mcp-tools.ts throws without a real DATABASE_URL,
 * even for assertions that never touch a handler. Same constraint
 * commands.test.ts already documents; same fix: type-only imports here,
 * real imports deferred into beforeAll behind describe.skipIf. Run
 * manually with: `DATABASE_URL=... bun run test` (packages/agent-runtime).
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "buildCopilotMcpServer / buildCopilotToolDefinitions (Fase 2)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let buildCopilotMcpServer: typeof BuildCopilotMcpServer;
    let buildCopilotToolDefinitions: typeof BuildCopilotToolDefinitions;
    let COPILOT_MCP_TOOL_NAMES: typeof CopilotMcpToolNames;
    let validateOrchestratorOutput: typeof ValidateOrchestratorOutput;
    let workspaceId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({
        buildCopilotMcpServer,
        buildCopilotToolDefinitions,
        COPILOT_MCP_TOOL_NAMES,
      } = await import("../src/mcp-tools"));
      ({ validateOrchestratorOutput } = await import("../src/output-schema"));

      const workspace = await database.workspace.create({
        data: {
          clerkOrgId: `org_mcp_tools_test_${suffix}`,
          name: "MCP Tools Test",
        },
      });
      workspaceId = workspace.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("buildCopilotMcpServer returns an in-process ('sdk') server config named executar-copiloto", () => {
      const server = buildCopilotMcpServer(workspaceId, "actor_test");
      expect(server.type).toBe("sdk");
      expect(server.name).toBe("executar-copiloto");
      expect(server.instance).toBeDefined();
    });

    test("COPILOT_MCP_TOOL_NAMES has 6 entries, each namespaced under mcp__executar-copiloto__", () => {
      expect(COPILOT_MCP_TOOL_NAMES).toHaveLength(6);
      for (const name of COPILOT_MCP_TOOL_NAMES) {
        expect(name).toMatch(QUALIFIED_TOOL_NAME_PATTERN);
      }
    });

    test("covers the same 6 commands as tools.ts (4 read commands + propose/confirm replan)", () => {
      const definitions = buildCopilotToolDefinitions(
        workspaceId,
        "actor_test"
      );
      expect(definitions.map((d) => d.name).sort()).toEqual(
        [
          "agora",
          "bomdia",
          "confirmarReplanejamento",
          "estado",
          "fechardia",
          "proporReplanejamento",
        ].sort()
      );
    });

    test("read commands are readOnlyHint; confirmarReplanejamento (the only real write) is not", () => {
      const definitions = buildCopilotToolDefinitions(
        workspaceId,
        "actor_test"
      );
      const readOnly = [
        "bomdia",
        "agora",
        "estado",
        "fechardia",
        "proporReplanejamento",
      ];
      for (const name of readOnly) {
        expect(
          definitions.find((d) => d.name === name)?.annotations?.readOnlyHint
        ).toBe(true);
      }
      expect(
        definitions.find((d) => d.name === "confirmarReplanejamento")
          ?.annotations?.readOnlyHint
      ).toBe(false);
    });

    test("bomdia handler returns MCP text content wrapping a valid orchestrator output", async () => {
      const definitions = buildCopilotToolDefinitions(
        workspaceId,
        `actor_${suffix}`
      );
      const bomdia = definitions.find((d) => d.name === "bomdia");
      const result = await bomdia?.handler({}, undefined);
      expect(result?.content).toHaveLength(1);
      expect(result?.content[0].type).toBe("text");

      const text = (result?.content[0] as { type: "text"; text: string }).text;
      const output = JSON.parse(text);
      expect(() => validateOrchestratorOutput(output)).not.toThrow();
    });

    test("proporReplanejamento never writes; confirmarReplanejamento does — same PRE_APPROVE gate as tools.ts", async () => {
      const definitions = buildCopilotToolDefinitions(
        workspaceId,
        `actor_${suffix}`
      );
      const propose = definitions.find(
        (d) => d.name === "proporReplanejamento"
      );
      const confirm = definitions.find(
        (d) => d.name === "confirmarReplanejamento"
      );

      const proposal = {
        deliverableTitle: `MCP gate test ${suffix}`,
        tasks: [{ title: "Task A" }],
      };

      const countBefore = await database.deliverable.count({
        where: { workspaceId },
      });

      const proposeResult = await propose?.handler(proposal, undefined);
      const proposedOutput = JSON.parse(
        (proposeResult?.content[0] as { type: "text"; text: string }).text
      );
      expect(proposedOutput.write_policy.allowed).toBe(false);

      const countAfterPropose = await database.deliverable.count({
        where: { workspaceId },
      });
      expect(countAfterPropose).toBe(countBefore);

      const confirmResult = await confirm?.handler(proposal, undefined);
      const confirmedOutput = JSON.parse(
        (confirmResult?.content[0] as { type: "text"; text: string }).text
      );
      expect(confirmedOutput.write_policy.allowed).toBe(true);

      const countAfterConfirm = await database.deliverable.count({
        where: { workspaceId },
      });
      expect(countAfterConfirm).toBe(countBefore + 1);
    });
  }
);
