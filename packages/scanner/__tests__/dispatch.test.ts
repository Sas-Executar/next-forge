import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { dispatch as Dispatch, undo as Undo } from "../src/dispatch";
import type { registerSymbol as RegisterSymbol } from "../src/registry";

/**
 * Real DB-backed dispatch/undo — same skip/dynamic-import pattern as
 * every other DB-gated suite in this repo. Covers PRD-SCANNER-001's
 * acceptance criteria directly:
 *  - "Done com tarefa aberta muda exatamente uma tarefa e cria mutação
 *    reversível" (REQ-SCAN-009)
 *  - "Se nenhuma tarefa aberta puder ser resolvida... NO_OPEN_TASK"
 *    (REQ-SCAN-010)
 *  - Undo restores the task's previous state.
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/scanner).
 */
describe.skipIf(!process.env.DATABASE_URL)("dispatch / undo (M09-T02)", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let dispatch: typeof Dispatch;
  let undo: typeof Undo;
  let registerSymbol: typeof RegisterSymbol;
  let workspaceId: string;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ dispatch, undo } = await import("../src/dispatch"));
    ({ registerSymbol } = await import("../src/registry"));

    const workspace = await database.workspace.create({
      data: {
        clerkOrgId: `org_scanner_test_${suffix}`,
        name: "Scanner Test",
      },
    });
    workspaceId = workspace.id;

    await registerSymbol(workspaceId, {
      symbolId: "SYM-CHAT-001",
      semantic: "CHAT",
      command: "OPEN_CHAT",
      embeddings: [new Float32Array([1, 0, 0])],
    });
    await registerSymbol(workspaceId, {
      symbolId: "SYM-DONE-001",
      semantic: "DONE",
      command: "COMPLETE_LATEST_OPEN_TASK",
      embeddings: [new Float32Array([0, 1, 0])],
    });
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("OPEN_CHAT dispatches without mutating any domain state", async () => {
    const result = await dispatch(workspaceId, "SYM-CHAT-001", "user_1");
    expect(result).toEqual({
      status: "OK",
      symbolId: "SYM-CHAT-001",
      command: "OPEN_CHAT",
      mutation: null,
    });
  });

  test("COMPLETE_LATEST_OPEN_TASK with no open task returns NO_OPEN_TASK and mutates nothing", async () => {
    const result = await dispatch(workspaceId, "SYM-DONE-001", "user_1");
    expect(result).toEqual({ status: "NO_OPEN_TASK" });
  });

  test("COMPLETE_LATEST_OPEN_TASK completes exactly the most recently updated DOING/VERIFY task, with reversible evidence", async () => {
    const older = await database.task.create({
      data: { workspaceId, title: "Older doing task", state: "DOING" },
    });
    // Ensure a distinct updatedAt ordering.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = await database.task.create({
      data: { workspaceId, title: "Newer verify task", state: "VERIFY" },
    });

    const result = await dispatch(workspaceId, "SYM-DONE-001", "user_1");
    expect(result.status).toBe("OK");
    if (result.status !== "OK" || !result.mutation) {
      throw new Error("expected an OK result with a mutation");
    }
    expect(result.mutation.taskId).toBe(newer.id);
    expect(result.mutation.previousState).toBe("VERIFY");
    expect(result.mutation.newState).toBe("DONE");

    const updatedNewer = await database.task.findUniqueOrThrow({
      where: { id: newer.id },
    });
    expect(updatedNewer.state).toBe("DONE");
    const updatedOlder = await database.task.findUniqueOrThrow({
      where: { id: older.id },
    });
    expect(updatedOlder.state).toBe("DOING");

    const evidence = await database.evidence.findMany({
      where: { taskId: newer.id },
    });
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.grade).toBe("A_OBSERVADO");

    // Undo restores the exact previous state.
    const undoResult = await undo(
      workspaceId,
      result.mutation.mutationId,
      "user_1"
    );
    expect(undoResult.status).toBe("OK");
    const restored = await database.task.findUniqueOrThrow({
      where: { id: newer.id },
    });
    expect(restored.state).toBe("VERIFY");

    // Repeat-undo is an error, not a silent no-op.
    const repeatUndo = await undo(
      workspaceId,
      result.mutation.mutationId,
      "user_1"
    );
    expect(repeatUndo.status).toBe("ERROR");
  });

  test("a disabled symbol returns DISABLED and mutates nothing", async () => {
    await database.visualSymbol.update({
      where: {
        workspaceId_symbolId: { workspaceId, symbolId: "SYM-CHAT-001" },
      },
      data: { enabled: false },
    });
    const result = await dispatch(workspaceId, "SYM-CHAT-001", "user_1");
    expect(result).toEqual({ status: "DISABLED", symbolId: "SYM-CHAT-001" });
  });

  test("an unrecognized symbolId returns UNKNOWN", async () => {
    const result = await dispatch(workspaceId, "SYM-NOT-REGISTERED", "user_1");
    expect(result).toEqual({ status: "UNKNOWN" });
  });
});
