import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Fase 5 — same mocking strategy as __tests__/server.test.ts: exercises
 * runFaseAtivacao()'s own validation/error paths (missing outputFormat
 * for CONCLUIDA, missing ANTHROPIC_API_KEY) without needing a real
 * Agent SDK session, Postgres, or credential. The actual query() call
 * and advanceFaseAtivacao() integration through a real structured
 * output are not exercised here — see packages/domain/__tests__/
 * ativacao-orchestrator.test.ts for advanceFaseAtivacao()'s own direct
 * coverage of the "Operations não inicia sem saída válida de
 * Productivity" aceite.
 */
vi.mock("@repo/database/keys", () => ({
  keys: () => ({ DATABASE_URL: "postgresql://stub/stub" }),
}));
vi.mock("@repo/database", () => ({ forWorkspace: vi.fn() }));
vi.mock("@repo/agent-runtime", () => ({
  buildCopilotMcpServer: vi.fn(() => ({
    type: "sdk",
    name: "executar-copiloto",
  })),
  COPILOT_MCP_TOOL_NAMES: ["mcp__executar-copiloto__bomdia"],
}));

describe("runFaseAtivacao", () => {
  beforeEach(() => {
    vi.resetModules();
    // See __tests__/server.test.ts's own comment: `= undefined` would set
    // the string "undefined" (truthy), not actually unset the var.
    // biome-ignore lint/performance/noDelete: see comment above — an assignment is not equivalent for process.env
    delete process.env.ANTHROPIC_API_KEY;
  });

  test("CONCLUIDA has no outputFormat — rejected before any query() call or AgentRun", async () => {
    const { runFaseAtivacao } = await import("../src/ativacao");
    const result = await runFaseAtivacao(
      "ws_1",
      "CONCLUIDA",
      "ONBOARDING",
      "prompt"
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("CONCLUIDA");
    }
  });

  test("every non-terminal fase has an outputFormat — missing ANTHROPIC_API_KEY is the next (and only) failure", async () => {
    const { runFaseAtivacao } = await import("../src/ativacao");
    const fasesComOutput = [
      "ONBOARDING",
      "SCANNER",
      "PRODUCTIVITY",
      "OPERATIONS",
      "MODO_ROTINA",
      "PRIMEIRO_ENTREGAVEL",
    ] as const;
    for (const fase of fasesComOutput) {
      const result = await runFaseAtivacao("ws_1", fase, fase, "prompt");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain("ANTHROPIC_API_KEY");
      }
    }
  });
});
