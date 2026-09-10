import "server-only";
import { forWorkspace } from "@repo/database";
import { canTransitionTask } from "@repo/domain";
import type { CommandResult, TaskCompletionMutation } from "./types";

/**
 * "Latest open task" for COMPLETE_LATEST_OPEN_TASK (REQ-SCAN-009) has
 * no selection rule anywhere in the corpus — genuinely unspecified
 * (confirmed: PRD/SPEC/API-contract docs, and the Blueprint's own
 * domain-model/business-rules/state-machine docs, none define
 * "latest"). This package's own disclosed choice: "open" = actively
 * in-progress (DOING or VERIFY — the states between READY and DONE),
 * not merely eligible/backlog, since scanning Done physically means
 * "I just finished the work I was doing," not "promote something from
 * the backlog." "Latest" = most recently updated. A single global
 * ordering across the whole workspace (not scoped to a project) — no
 * scope qualifier is given either.
 */
const findLatestOpenTask = async (db: ReturnType<typeof forWorkspace>) => {
  return await db.task.findFirst({
    where: { state: { in: ["DOING", "VERIFY"] } },
    orderBy: { updatedAt: "desc" },
  });
};

/**
 * CommandDispatcher (SPEC-SCANNER-001 / API-SCANNER-ACTION-001).
 * "The visual model MUST NOT mutate domain state directly" — this is
 * the one boundary that does, and only for COMPLETE_LATEST_OPEN_TASK;
 * OPEN_CHAT/OPEN_SELECTOR are navigation, not domain mutations (this
 * function returns OK with `mutation: null` for both, letting
 * apps/mobile's own router handle the actual screen transition).
 *
 * `actorRef` is the Clerk user id of whoever is holding the phone —
 * dispatch() is called after Clerk auth resolves in apps/mobile's
 * scanner screen, the same "auth resolved by the caller, not this
 * package" pattern packages/routines' pipeline.ts and every server
 * action in this repo already follow.
 */
export const dispatch = async (
  workspaceId: string,
  symbolId: string,
  actorRef: string
): Promise<CommandResult> => {
  const db = forWorkspace(workspaceId);

  const symbol = await db.visualSymbol.findUnique({
    where: { workspaceId_symbolId: { workspaceId, symbolId } },
  });
  // A dispatch for a symbolId the registry doesn't know is functionally
  // the same outcome as recognition never having matched it — UNKNOWN,
  // not a separate error class. In normal operation this shouldn't
  // happen (recognize.ts only returns RECOGNIZED for a row it read),
  // but dispatch() is a public entry point on its own, not guaranteed
  // to always be called right after a fresh recognize() call.
  if (!symbol) {
    return { status: "UNKNOWN" };
  }
  if (!symbol.enabled) {
    return { status: "DISABLED", symbolId };
  }

  if (symbol.command === "OPEN_CHAT" || symbol.command === "OPEN_SELECTOR") {
    return {
      status: "OK",
      symbolId,
      command: symbol.command,
      mutation: null,
    };
  }

  // symbol.command === "COMPLETE_LATEST_OPEN_TASK"
  const task = await findLatestOpenTask(db);
  if (!task) {
    return { status: "NO_OPEN_TASK" };
  }

  const decision = canTransitionTask(task.state, "DONE", "USER");
  if (decision !== "ALLOW") {
    // Structurally shouldn't happen — USER is always ALLOW for a
    // legal transition (packages/domain/src/task-state.ts) — but
    // dispatch() never silently no-ops a denial, per every other
    // AuthorityGate call site in this repo (M10's pipeline.ts included).
    return {
      status: "ERROR",
      message: `${task.state} -> DONE was not authorized (AuthorityGate: ${decision}).`,
    };
  }

  const previousState = task.state;

  const [, , , mutationRow] = await db.$transaction([
    db.task.update({ where: { id: task.id }, data: { state: "DONE" } }),
    db.evidence.create({
      data: {
        workspaceId,
        taskId: task.id,
        // A physical symbol scan is the directly-observed event itself
        // — A_OBSERVADO (the strongest grade) is a real, defensible
        // mapping this package chooses; the corpus has no "evidence
        // grade" concept for the Scanner (or anywhere) to follow
        // instead — disclosed, same as the "latest open task" choice
        // above.
        grade: "A_OBSERVADO",
        description: `Concluído via scan do símbolo Done (${symbolId}).`,
      },
    }),
    db.auditEvent.create({
      data: {
        workspaceId,
        actorType: "USER",
        actorRef,
        action: "SCANNER_TASK_COMPLETED",
        objectType: "Task",
        objectId: task.id,
        metadata: { symbolId, from: previousState, to: "DONE" },
      },
    }),
    db.scannerMutation.create({
      data: {
        workspaceId,
        visualSymbolId: symbol.id,
        taskId: task.id,
        previousState,
        newState: "DONE",
      },
    }),
  ]);

  const mutation: TaskCompletionMutation = {
    mutationId: mutationRow.id,
    taskId: task.id,
    previousState,
    newState: "DONE",
    createdAt: mutationRow.createdAt.toISOString(),
  };

  return { status: "OK", symbolId, command: symbol.command, mutation };
};

/**
 * Undo (SPEC-SCANNER-001 "Undo restaura a mutação correspondente" —
 * the corpus specifies no more than that one sentence: no time window,
 * no authorization rule beyond it existing, no repeat-undo behavior.
 * This implementation's own disclosed choices: any workspace member
 * may undo (same MEMBER-level authority as completeAction, not
 * OWNER-gated — undoing your own or a teammate's scan is a normal
 * execution correction, not an admin action); undo is one-shot, not
 * idempotent — undoing an already-undone mutation is an ERROR rather
 * than a silent no-op, so a caller can't lose track of whether their
 * click actually did anything.
 */
export const undo = async (
  workspaceId: string,
  mutationId: string,
  actorRef: string
): Promise<CommandResult> => {
  const db = forWorkspace(workspaceId);

  const mutationRow = await db.scannerMutation.findUnique({
    where: { id: mutationId },
    include: { visualSymbol: true },
  });
  if (!mutationRow) {
    return {
      status: "ERROR",
      message: `ScannerMutation ${mutationId} not found.`,
    };
  }
  if (mutationRow.undone) {
    return {
      status: "ERROR",
      message: `ScannerMutation ${mutationId} was already undone.`,
    };
  }
  if (!(mutationRow.taskId && mutationRow.previousState)) {
    return {
      status: "ERROR",
      message: `ScannerMutation ${mutationId} has no taskId/previousState to restore.`,
    };
  }

  await db.$transaction([
    db.task.update({
      where: { id: mutationRow.taskId },
      data: { state: mutationRow.previousState },
    }),
    db.scannerMutation.update({
      where: { id: mutationId },
      data: { undone: true },
    }),
    db.auditEvent.create({
      data: {
        workspaceId,
        actorType: "USER",
        actorRef,
        action: "SCANNER_TASK_COMPLETION_UNDONE",
        objectType: "Task",
        objectId: mutationRow.taskId,
        metadata: {
          mutationId,
          restoredTo: mutationRow.previousState,
        },
      },
    }),
  ]);

  return {
    status: "OK",
    symbolId: mutationRow.visualSymbol.symbolId,
    command: mutationRow.visualSymbol.command,
    mutation: null,
  };
};
