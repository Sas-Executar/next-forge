import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { createPostgresSessionStore as CreatePostgresSessionStore } from "../src/session-store";

/**
 * Fase 3 (D2/ADR-004) — same describe.skipIf(DATABASE_URL) + dynamic
 * import pattern as packages/agent-runtime/__tests__/commands.test.ts:
 * this file exercises real read/write behavior against Postgres, not
 * just option-building, so mocking @repo/database (like
 * __tests__/tenant.test.ts and __tests__/server.test.ts do) would test
 * nothing real. Run manually with: `DATABASE_URL=... bun run test`
 * (apps/copiloto-runtime). Not run against a real Postgres in this
 * sandbox session (no DATABASE_URL) — every test below is skipped here.
 */
describe.skipIf(!process.env.DATABASE_URL)("createPostgresSessionStore", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let createPostgresSessionStore: typeof CreatePostgresSessionStore;
  let workspaceId: string;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ createPostgresSessionStore } = await import("../src/session-store"));

    const workspace = await database.workspace.create({
      data: {
        clerkOrgId: `org_session_store_test_${suffix}`,
        name: "Session Store Test",
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("load() returns null for a session that was never appended", async () => {
    const store = createPostgresSessionStore(workspaceId);
    const result = await store.load({
      projectKey: `proj_${suffix}`,
      sessionId: "never-written",
    });
    expect(result).toBeNull();
  });

  test("append() then load() round-trips entries in order, deep-equal", async () => {
    const store = createPostgresSessionStore(workspaceId);
    const key = {
      projectKey: `proj_${suffix}`,
      sessionId: `sess_${suffix}`,
    };
    const entries = [
      { type: "user", uuid: randomUUID(), text: "first" },
      { type: "assistant", uuid: randomUUID(), text: "second" },
    ];

    await store.append(key, entries);
    const loaded = await store.load(key);

    expect(loaded).toEqual(entries);
  });

  test("append() is idempotent by uuid — a retried batch does not duplicate rows", async () => {
    const store = createPostgresSessionStore(workspaceId);
    const key = {
      projectKey: `proj_${suffix}`,
      sessionId: `sess_dedup_${suffix}`,
    };
    const entry = { type: "user", uuid: randomUUID(), text: "once" };

    await store.append(key, [entry]);
    await store.append(key, [entry]); // simulated retry of the same batch

    const loaded = await store.load(key);
    expect(loaded).toHaveLength(1);
  });

  test("append() never dedups entries without a uuid", async () => {
    const store = createPostgresSessionStore(workspaceId);
    const key = {
      projectKey: `proj_${suffix}`,
      sessionId: `sess_nouuid_${suffix}`,
    };
    const entry = { type: "title", text: "same content, no uuid" };

    await store.append(key, [entry]);
    await store.append(key, [entry]);

    const loaded = await store.load(key);
    expect(loaded).toHaveLength(2);
  });

  test("listSessions()/listSessionSummaries() reflect appended sessions for a projectKey", async () => {
    const store = createPostgresSessionStore(workspaceId);
    const projectKey = `proj_listing_${suffix}`;
    const key = { projectKey, sessionId: `sess_listing_${suffix}` };

    await store.append(key, [{ type: "user", uuid: randomUUID() }]);

    const sessions = await store.listSessions?.(projectKey);
    expect(sessions?.map((s) => s.sessionId)).toContain(key.sessionId);

    const summaries = await store.listSessionSummaries?.(projectKey);
    expect(summaries?.map((s) => s.sessionId)).toContain(key.sessionId);
  });

  test("a subpath (subagent) entry does not contribute to the main session's summary", async () => {
    const store = createPostgresSessionStore(workspaceId);
    const projectKey = `proj_subagent_${suffix}`;
    const sessionId = `sess_subagent_${suffix}`;

    await store.append(
      { projectKey, sessionId, subpath: "subagents/agent-1" },
      [{ type: "user", uuid: randomUUID() }]
    );

    const summaries = await store.listSessionSummaries?.(projectKey);
    expect(summaries?.some((s) => s.sessionId === sessionId)).toBe(false);
  });

  test("listSubkeys() discovers subagent subpaths for a session", async () => {
    const store = createPostgresSessionStore(workspaceId);
    const projectKey = `proj_subkeys_${suffix}`;
    const sessionId = `sess_subkeys_${suffix}`;

    await store.append({ projectKey, sessionId }, [
      { type: "user", uuid: randomUUID() },
    ]);
    await store.append(
      { projectKey, sessionId, subpath: "subagents/agent-1" },
      [{ type: "user", uuid: randomUUID() }]
    );

    const subkeys = await store.listSubkeys?.({ projectKey, sessionId });
    expect(subkeys).toEqual(["subagents/agent-1"]);
  });

  test("delete() removes the main transcript, all subpaths, and the summary", async () => {
    const store = createPostgresSessionStore(workspaceId);
    const projectKey = `proj_delete_${suffix}`;
    const sessionId = `sess_delete_${suffix}`;

    await store.append({ projectKey, sessionId }, [
      { type: "user", uuid: randomUUID() },
    ]);
    await store.append(
      { projectKey, sessionId, subpath: "subagents/agent-1" },
      [{ type: "user", uuid: randomUUID() }]
    );

    await store.delete?.({ projectKey, sessionId });

    expect(await store.load({ projectKey, sessionId })).toBeNull();
    expect(
      await store.load({ projectKey, sessionId, subpath: "subagents/agent-1" })
    ).toBeNull();
    const summaries = await store.listSessionSummaries?.(projectKey);
    expect(summaries?.some((s) => s.sessionId === sessionId)).toBe(false);
  });
});
