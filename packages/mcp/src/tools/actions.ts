import "server-only";

import { type NextActionResult, nextAction } from "@repo/application";
import type { EvidenceGrade } from "@repo/schemas";
import type { McpToolContext } from "../context";
import { type TaskUpdateResult, tasksUpdate } from "./tasks";

/**
 * `actions.get_next` (M12-T02) — the Best Next Action (WIP=1), the exact
 * same `nextAction()` (packages/application, M04-T02) /now reads. No
 * second selection algorithm for MCP callers.
 */
export const actionsGetNext = (
  ctx: McpToolContext
): Promise<NextActionResult> => nextAction(ctx.workspaceId);

/**
 * `actions.complete` (M12-T02) — thin wrapper over `tasks.update` fixed
 * to `toState: "DONE"`. Per tasks.ts's own comment, an MCP (AGENT-actor)
 * caller is never auto-allowed straight into DONE — this will honestly
 * report `HUMAN_REQUIRED` rather than complete the task, which is the
 * correct application of SPEC-ROUTINES-001 §7's AuthorityGate baseline
 * to an external tool surface, not a bug: an MCP client can identify and
 * prepare the completion (evidence attached, ready to go) but the human
 * still confirms it, same as any other DOING/VERIFY/DONE transition.
 */
export const actionsComplete = (
  ctx: McpToolContext,
  input: {
    readonly taskId: string;
    readonly evidence: {
      readonly description: string;
      readonly grade: EvidenceGrade;
      readonly url?: string;
    };
  }
): Promise<TaskUpdateResult> =>
  tasksUpdate(ctx, {
    taskId: input.taskId,
    toState: "DONE",
    evidence: input.evidence,
  });
