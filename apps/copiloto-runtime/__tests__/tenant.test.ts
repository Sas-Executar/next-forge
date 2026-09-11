import { beforeEach, describe, expect, test, vi } from "vitest";

// tenant.ts imports ../env, which imports @repo/database/keys — mocked
// here (not skipped) the same way apps/api/__tests__/*.test.ts mocks
// @repo/database itself: this file tests pure option-building logic,
// not real env validation, so a stub keeps the test real instead of
// gating the whole file behind describe.skipIf(DATABASE_URL).
vi.mock("@repo/database/keys", () => ({
  keys: () => ({ DATABASE_URL: "postgresql://stub/stub" }),
}));

describe("buildTenantQueryOptions", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.COPILOTO_RUNTIME_WORK_DIR = "/work/tenants";
    process.env.COPILOTO_RUNTIME_CONFIG_DIR = "/work/claude-config";
  });

  test("builds a deterministic per-workspace cwd and CLAUDE_CONFIG_DIR", async () => {
    const { buildTenantQueryOptions } = await import("../src/tenant");
    const options = buildTenantQueryOptions("ws_abc123");
    expect(options.cwd).toBe("/work/tenants/ws_abc123");
    expect(options.env.CLAUDE_CONFIG_DIR).toBe("/work/claude-config/ws_abc123");
  });

  test("always returns settingSources: [] and disables auto memory (multi-tenant isolation)", async () => {
    const { buildTenantQueryOptions } = await import("../src/tenant");
    const options = buildTenantQueryOptions("ws_abc123");
    expect(options.settingSources).toEqual([]);
    expect(options.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY).toBe("1");
  });

  test("two different workspaces never share a cwd or CLAUDE_CONFIG_DIR", async () => {
    const { buildTenantQueryOptions } = await import("../src/tenant");
    const a = buildTenantQueryOptions("ws_aaa");
    const b = buildTenantQueryOptions("ws_bbb");
    expect(a.cwd).not.toBe(b.cwd);
    expect(a.env.CLAUDE_CONFIG_DIR).not.toBe(b.env.CLAUDE_CONFIG_DIR);
  });

  test("rejects an empty workspaceId", async () => {
    const { buildTenantQueryOptions } = await import("../src/tenant");
    expect(() => buildTenantQueryOptions("")).toThrow();
  });

  test.each([
    "../escape",
    "ws/with/slash",
    "ws with space",
    "ws;drop",
  ])("rejects a workspaceId that isn't a safe path segment: %s", async (unsafe) => {
    const { buildTenantQueryOptions } = await import("../src/tenant");
    expect(() => buildTenantQueryOptions(unsafe)).toThrow();
  });

  test("accepts a real cuid-shaped workspaceId", async () => {
    const { buildTenantQueryOptions } = await import("../src/tenant");
    expect(() =>
      buildTenantQueryOptions("clx1a2b3c4d5e6f7g8h9i0j1k")
    ).not.toThrow();
  });
});
