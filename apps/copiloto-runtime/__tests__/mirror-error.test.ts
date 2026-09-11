import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Fase 9 — same mock-@repo/database pattern as server.test.ts/
 * tenant.test.ts: this exercises the real error/alert path in
 * append() (session-store.ts) without needing a live Postgres, since
 * that path only depends on the DB call rejecting, not on any real
 * row ever being written.
 */
vi.mock("@repo/database/keys", () => ({
  keys: () => ({ DATABASE_URL: "postgresql://stub/stub" }),
}));

const createMany = vi.fn();
vi.mock("@repo/database", () => ({
  forWorkspace: () => ({
    agentSessionEntry: { createMany },
    $transaction: vi.fn(),
  }),
}));

describe("createPostgresSessionStore — mirror_error alert", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // silence real stderr output during this test run
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    createMany.mockReset();
  });

  test("a failed append() logs a greppable mirror_error line and still rejects", async () => {
    const { createPostgresSessionStore } = await import("../src/session-store");
    const dbError = new Error("connection terminated unexpectedly");
    createMany.mockRejectedValueOnce(dbError);

    const store = createPostgresSessionStore("ws_test");
    const key = { projectKey: "proj_1", sessionId: "sess_1" };

    await expect(
      store.append(key, [{ type: "user", uuid: "u1" }])
    ).rejects.toThrow(dbError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "mirror_error",
      expect.objectContaining({
        workspaceId: "ws_test",
        projectKey: "proj_1",
        sessionId: "sess_1",
        error: dbError.message,
      })
    );
  });

  test("append() with an empty batch never touches the DB and never alerts", async () => {
    const { createPostgresSessionStore } = await import("../src/session-store");
    const store = createPostgresSessionStore("ws_test");

    await store.append({ projectKey: "proj_1", sessionId: "sess_1" }, []);

    expect(createMany).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
