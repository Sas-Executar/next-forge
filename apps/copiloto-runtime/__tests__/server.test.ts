import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Fase 3 — mocks @repo/database(/keys) and @repo/agent-runtime, the same
 * pattern apps/api/__tests__/*.test.ts already uses for its own route
 * handlers: this exercises handleRequest()'s real routing/validation
 * logic (a genuine unit under test) without needing DATABASE_URL or
 * ANTHROPIC_API_KEY — those two only matter once runQuery() actually
 * calls query(), which none of these tests reach.
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

const jsonRequest = (method: string, path: string, body?: unknown): Request =>
  new Request(`http://localhost${path}`, {
    method,
    ...(body !== undefined
      ? {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        }
      : {}),
  });

describe("handleRequest", () => {
  beforeEach(() => {
    vi.resetModules();
    // `process.env.KEY = undefined` does NOT unset it — Node coerces the
    // assignment to the string "undefined" (7 truthy chars), which would
    // make env.ANTHROPIC_API_KEY pass its z.string().min(1) check and
    // defeat every "no ANTHROPIC_API_KEY" test below. delete is the only
    // correct way to actually remove an env var here.
    // biome-ignore lint/performance/noDelete: see comment above — an assignment is not equivalent for process.env
    delete process.env.ANTHROPIC_API_KEY;
  });

  test("GET /health returns 200 { status: ok } without touching the SDK", async () => {
    const { handleRequest } = await import("../src/server");
    const response = await handleRequest(jsonRequest("GET", "/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("GET an unknown route returns 404", async () => {
    const { handleRequest } = await import("../src/server");
    const response = await handleRequest(jsonRequest("GET", "/nope"));
    expect(response.status).toBe(404);
  });

  test("POST /sessoes with an invalid body returns 400 with the validation errors", async () => {
    const { handleRequest } = await import("../src/server");
    const response = await handleRequest(
      jsonRequest("POST", "/sessoes", { workspaceId: "" })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("POST /sessoes with a valid body but no ANTHROPIC_API_KEY returns 503", async () => {
    const { handleRequest } = await import("../src/server");
    const response = await handleRequest(
      jsonRequest("POST", "/sessoes", {
        workspaceId: "ws_1",
        prompt: "oi",
      })
    );
    expect(response.status).toBe(503);
  });

  test("POST /sessoes/:id/mensagens with a valid body but no ANTHROPIC_API_KEY returns 503", async () => {
    const { handleRequest } = await import("../src/server");
    const response = await handleRequest(
      jsonRequest("POST", "/sessoes/sess_1/mensagens", {
        workspaceId: "ws_1",
        prompt: "continue",
      })
    );
    expect(response.status).toBe(503);
  });

  test("GET /sessoes/:id/stream without workspaceId/prompt query params returns 400", async () => {
    const { handleRequest } = await import("../src/server");
    const response = await handleRequest(
      jsonRequest("GET", "/sessoes/sess_1/stream")
    );
    expect(response.status).toBe(400);
  });

  test("GET /sessoes/:id/stream with query params but no ANTHROPIC_API_KEY returns 503", async () => {
    const { handleRequest } = await import("../src/server");
    const response = await handleRequest(
      jsonRequest("GET", "/sessoes/sess_1/stream?workspaceId=ws_1&prompt=oi")
    );
    expect(response.status).toBe(503);
  });
});
