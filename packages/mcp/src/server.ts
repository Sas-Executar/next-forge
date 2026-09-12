import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { forWorkspace, type Prisma } from "@repo/database";
import { z } from "zod";
import type { McpToolContext } from "./context";
import { actionsComplete, actionsGetNext } from "./tools/actions";
import { evidenceCreate } from "./tools/evidence";
import { mapaGenerate } from "./tools/mapa";
import { projectsCreate, projectsGet, projectsList } from "./tools/projects";
import { reportsGenerate } from "./tools/reports";
import { routinesList, routinesRun } from "./tools/routines";
import { stateGet } from "./tools/state";
import { tasksCreate, tasksGet, tasksList, tasksUpdate } from "./tools/tasks";

const evidenceGrade = z.enum([
  "A_OBSERVADO",
  "B_PRIMARIO",
  "C_PUBLICADO",
  "D_INTERNO",
  "E_INFERIDO",
]);
const evidenceInput = z.object({
  description: z.string().min(1).max(2000),
  grade: evidenceGrade,
  url: z.string().url().optional(),
});
const taskState = z.enum([
  "BACKLOG_VALIDATED",
  "READY",
  "DOING",
  "VERIFY",
  "DONE",
  "BLOCKED",
]);

const textResult = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});

const errorResult = (error: unknown): CallToolResult => ({
  isError: true,
  content: [
    {
      type: "text",
      text: error instanceof Error ? error.message : String(error),
    },
  ],
});

/**
 * M12-T03's "every MCP call logs a real AuditEvent" — logged here
 * unconditionally, for every tool (read or write) and every outcome
 * (success or failure), through the same RLS-scoped `forWorkspace()`
 * client every other write path uses. This is deliberately separate from
 * the domain-specific AuditEvent rows a mutating tool (projects.create,
 * tasks.update, evidence.create) additionally writes inside its own
 * function for the object it touched — this one is the generic "an MCP
 * tool was invoked" trail, present even for read-only tools that have no
 * object of their own to log against.
 */
const logToolCall = async (
  ctx: McpToolContext,
  toolName: string,
  input: unknown,
  outcome:
    | { readonly ok: true }
    | { readonly ok: false; readonly error: string }
): Promise<void> => {
  await forWorkspace(ctx.workspaceId).auditEvent.create({
    data: {
      workspaceId: ctx.workspaceId,
      actorType: "AGENT",
      actorRef: ctx.actorRef,
      action: "MCP_TOOL_CALL",
      objectType: "McpTool",
      objectId: toolName,
      authorityRuleId: `mcp:${toolName}`,
      // Same cast packages/routines/src/events.ts uses: a generic
      // object literal built from an `unknown` input isn't structurally
      // assignable to Prisma's InputJsonValue.
      metadata: { input, ...outcome } as unknown as Prisma.InputJsonValue,
    },
  });
};

/**
 * Builds one `McpServer` bound to a single resolved `McpToolContext`
 * (M12-T01/T02/T03) — a fresh instance per request (apps/api/app/mcp/
 * route.ts), since the context is derived from that request's Clerk
 * session and this repo runs the transport in stateless mode (see the
 * route's own comment on why).
 *
 * Tool set (M12-T02): the plan's own explicitly-scoped subset —
 * `projects.list/get/create`, `tasks.list/get/create/update`,
 * `actions.get_next/complete`, `evidence.create`, `state.get`,
 * `routines.list/run`, `reports.generate`, `mapa.generate` — mapped only
 * to domain capabilities this repo actually implements. NOT the 157-tool
 * `PRD-MCP.md` catalog `AGENT-CAPABILITY-SOURCES-001` names as a
 * supplied-but-unincorporated reference (`registered_reference` /
 * "GATE PENDENTE" per the Blueprint's own MASTER_INDEX_CHECKLIST.md,
 * confirmed by directly reading that file and CAPABILITY_SOURCE_MAP.md
 * rather than assuming from the plan's own paraphrase) — this tool set
 * is meant to grow incrementally in later milestones, not to block M12
 * on a catalog that doesn't exist in the Blueprint repo.
 *
 * Every tool that mutates state goes through the same domain guards the
 * web app uses (`canTransitionTask`, the eligibility/next-action
 * functions) with `actor: "AGENT"` — see tasks.ts's own comment on why
 * that makes DOING/VERIFY/DONE transitions come back `HUMAN_REQUIRED`
 * for every MCP caller, never silently performed. MCP gets no bypass.
 */
export const buildMcpServer = (ctx: McpToolContext): McpServer => {
  const server = new McpServer({ name: "executar-mcp", version: "0.0.0" });

  const zeroArg = <R>(
    name: string,
    fn: (ctx: McpToolContext) => Promise<R>
  ) => {
    server.registerTool(name, {}, async (): Promise<CallToolResult> => {
      try {
        const result = await fn(ctx);
        await logToolCall(ctx, name, {}, { ok: true });
        return textResult(result);
      } catch (error) {
        await logToolCall(
          ctx,
          name,
          {},
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }
        );
        return errorResult(error);
      }
    });
  };

  const withInput = <Shape extends Record<string, z.ZodTypeAny>, R>(
    name: string,
    shape: Shape,
    fn: (
      ctx: McpToolContext,
      input: { [K in keyof Shape]: z.infer<Shape[K]> }
    ) => Promise<R>
  ) => {
    const callback = async (
      input: { [K in keyof Shape]: z.infer<Shape[K]> }
    ): Promise<CallToolResult> => {
      try {
        const result = await fn(ctx, input);
        await logToolCall(ctx, name, input, { ok: true });
        return textResult(result);
      } catch (error) {
        await logToolCall(ctx, name, input, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
        return errorResult(error);
      }
    };
    // registerTool's generic signature infers `OutputArgs` from the
    // (omitted) outputSchema, which trips up structural assignability of
    // our concrete `CallToolResult` return type against its own inferred
    // zod-schema-derived result type — a generic-inference boundary
    // issue, not a real type mismatch (`CallToolResult` is the SDK's own
    // exported return type). Cast at this one call site rather than lose
    // type-checking on the callback's own body above.
    server.registerTool(name, { inputSchema: shape }, callback as never);
  };

  zeroArg("projects.list", projectsList);
  withInput("projects.get", { projectId: z.string().min(1) }, projectsGet);
  withInput(
    "projects.create",
    {
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
    },
    projectsCreate
  );

  withInput(
    "tasks.list",
    { projectId: z.string().min(1).optional() },
    tasksList
  );
  withInput("tasks.get", { taskId: z.string().min(1) }, tasksGet);
  withInput(
    "tasks.create",
    {
      projectId: z.string().min(1).optional(),
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
    },
    tasksCreate
  );
  withInput(
    "tasks.update",
    {
      taskId: z.string().min(1),
      toState: taskState,
      evidence: evidenceInput.optional(),
    },
    tasksUpdate
  );

  zeroArg("actions.get_next", actionsGetNext);
  withInput(
    "actions.complete",
    { taskId: z.string().min(1), evidence: evidenceInput },
    actionsComplete
  );

  withInput(
    "evidence.create",
    {
      taskId: z.string().min(1),
      description: z.string().min(1).max(2000),
      grade: evidenceGrade,
      url: z.string().url().optional(),
    },
    evidenceCreate
  );

  zeroArg("state.get", stateGet);

  zeroArg("routines.list", routinesList);
  withInput(
    "routines.run",
    {
      routineId: z.string().min(1),
      scheduledSlot: z.string().min(1).optional(),
    },
    routinesRun
  );

  withInput(
    "reports.generate",
    { projectId: z.string().min(1).optional() },
    reportsGenerate
  );

  withInput(
    "mapa.generate",
    {
      projection: z.enum([
        "mapa_operacional",
        "agora_proximo_depois",
        "status_terminal",
        "prisma_7d",
      ]),
      projectId: z.string().min(1).optional(),
      authorized: z.boolean().optional(),
      renderHtml: z.boolean().optional(),
    },
    mapaGenerate
  );

  return server;
};
