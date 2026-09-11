import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Fase 4 — mocks @repo/database(/keys) and @repo/agent-runtime, same
 * pattern as __tests__/server.test.ts: exercises the PreToolUse
 * decision logic (a pure function of its input) without needing a real
 * Postgres or a live Agent SDK session. PostToolUse/PostToolUseFailure/
 * createAgentRun/finishAgentRun do real Prisma writes and are not
 * exercised here — see session-store.test.ts's own disclosure for why
 * DB-backed behavior isn't mocked away in this repo's convention.
 */
vi.mock("@repo/database/keys", () => ({
  keys: () => ({ DATABASE_URL: "postgresql://stub/stub" }),
}));
vi.mock("@repo/database", () => ({ forWorkspace: vi.fn() }));
vi.mock("@repo/agent-runtime", () => ({
  COPILOT_MCP_TOOL_NAMES: [
    "mcp__executar-copiloto__bomdia",
    "mcp__executar-copiloto__agora",
  ],
}));

const preToolUseInput = (toolName: string) => ({
  hook_event_name: "PreToolUse" as const,
  tool_name: toolName,
  tool_input: {},
  tool_use_id: "tu_1",
  session_id: "s_1",
  cwd: "/work/tenants/ws_1",
  transcript_path: "/work/tenants/ws_1/transcript.jsonl",
});

describe("buildAgentHooks — PreToolUse allowlist enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("allows a tool call whose name is in COPILOT_MCP_TOOL_NAMES", async () => {
    const { buildAgentHooks } = await import("../src/hooks");
    const hooks = buildAgentHooks("ws_1", "run_1");
    const preToolUse = hooks.PreToolUse?.[0]?.hooks[0];
    const result = await preToolUse?.(
      preToolUseInput("mcp__executar-copiloto__bomdia"),
      "tu_1",
      { signal: new AbortController().signal }
    );
    expect(result).toEqual({});
  });

  test("denies a tool call outside the allowlist, e.g. a hypothetical scanner write tool", async () => {
    const { buildAgentHooks } = await import("../src/hooks");
    const hooks = buildAgentHooks("ws_1", "run_1");
    const preToolUse = hooks.PreToolUse?.[0]?.hooks[0];
    const result = await preToolUse?.(
      preToolUseInput("mcp__executar-scanner__write_symbol"),
      "tu_2",
      { signal: new AbortController().signal }
    );
    expect(result).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
      },
    });
  });

  test("denies a built-in tool (e.g. Bash) the same way — the allowlist is exhaustive, not MCP-only", async () => {
    const { buildAgentHooks } = await import("../src/hooks");
    const hooks = buildAgentHooks("ws_1", "run_1");
    const preToolUse = hooks.PreToolUse?.[0]?.hooks[0];
    const result = await preToolUse?.(preToolUseInput("Bash"), "tu_3", {
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({
      hookSpecificOutput: { permissionDecision: "deny" },
    });
  });

  test("registers exactly one matcher per hook event, covering PreToolUse/PostToolUse/PostToolUseFailure", async () => {
    const { buildAgentHooks } = await import("../src/hooks");
    const hooks = buildAgentHooks("ws_1", "run_1");
    expect(Object.keys(hooks).sort()).toEqual(
      ["PostToolUse", "PostToolUseFailure", "PreToolUse"].sort()
    );
  });
});
