import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import { canTransitionTask } from "@repo/domain";
import { emitBusinessEvent } from "@repo/observability/business-events";
import { taskStateSchema } from "@repo/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

const advanceSchema = z.object({
  taskId: z.string().min(1),
  toState: taskStateSchema,
  evidence: z
    .object({
      description: z.string().min(1).max(2000),
      grade: z.enum([
        "A_OBSERVADO",
        "B_PRIMARIO",
        "C_PUBLICADO",
        "D_INTERNO",
        "E_INFERIDO",
      ]),
      url: z.string().url().optional(),
    })
    .optional(),
});

/**
 * M21 — apps/mobile's network boundary for advancing a task's state
 * from the Agora screen. Ports apps/app's `completeAction` server
 * action (`app/actions/execution/complete-action.ts`) rather than
 * importing it: that action is `"use server"`, bound to Next.js's own
 * RPC mechanism and cache revalidation (`revalidatePath`), neither of
 * which apply to (or are callable from) an API route — the same reason
 * /scanner/dispatch's dispatch logic lives in `@repo/scanner/server`
 * instead of only inside a page action. `revalidatePath` is dropped
 * here on purpose: an API route has no page cache to invalidate: the
 * mobile client re-fetches GET /now after a successful advance instead.
 */
export const POST = async (request: Request): Promise<Response> => {
  let workspaceId: string;
  let actorRef: string;
  try {
    const { workspace, membership } = await requireRole("MEMBER");
    workspaceId = workspace.id;
    actorRef = membership.clerkUserId;
  } catch (error) {
    if (
      error instanceof NoActiveOrganizationError ||
      error instanceof WorkspaceNotFoundError
    ) {
      return new Response("No active workspace", { status: 409 });
    }
    if (error instanceof InsufficientRoleError) {
      return new Response("Forbidden", { status: 403 });
    }
    throw error;
  }

  const parsed = advanceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid body", ok: false },
      { status: 400 }
    );
  }
  const { taskId, toState, evidence } = parsed.data;

  const db = forWorkspace(workspaceId);
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json(
      { message: "Task not found", ok: false },
      { status: 404 }
    );
  }

  const decision = canTransitionTask(task.state, toState, "USER");
  if (decision !== "ALLOW") {
    return NextResponse.json(
      {
        message: `${task.state} -> ${toState} was not authorized (AuthorityGate: ${decision}).`,
        ok: false,
      },
      { status: 422 }
    );
  }

  // Core domain invariant (Blueprint, read-only): "'feito' não
  // substitui evidência" — DONE always requires a matching Evidence row.
  if (toState === "DONE" && !evidence) {
    return NextResponse.json(
      {
        message: `Task ${taskId}: DONE requires evidence.`,
        ok: false,
      },
      { status: 422 }
    );
  }

  const [updatedTask] = await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { state: toState } }),
    ...(evidence
      ? [
          db.evidence.create({
            data: {
              workspaceId,
              taskId,
              grade: evidence.grade,
              description: evidence.description,
              url: evidence.url,
            },
          }),
        ]
      : []),
    db.auditEvent.create({
      data: {
        workspaceId,
        actorType: "USER",
        actorRef,
        action: "TASK_STATE_TRANSITION",
        objectType: "Task",
        objectId: taskId,
        metadata: { from: task.state, to: toState },
      },
    }),
  ]);

  // M15-T02 (OBS-BIZ-001 §4) — same event apps/app's completeAction
  // emits, only for a real DONE transition.
  if (toState === "DONE") {
    await emitBusinessEvent(workspaceId, {
      eventName: "product.core_action_completed",
      component: "api/now/advance",
      outcome: "success",
      metadata: { taskId, evidenceGrade: evidence?.grade },
    });
  }

  return NextResponse.json({ ok: true, task: updatedTask });
};
