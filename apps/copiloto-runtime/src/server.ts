import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  buildCopilotMcpServer,
  COPILOT_MCP_TOOL_NAMES,
} from "@repo/agent-runtime";
import { z } from "zod";
import { env } from "../env";
import { buildAgentHooks, createAgentRun, finishAgentRun } from "./hooks";
import { createPostgresSessionStore } from "./session-store";
import { buildTenantQueryOptions } from "./tenant";

/**
 * Fase 3 (D2/ADR-004) — HTTP surface for the containerized runtime, per
 * the plan's §6.4 table: `POST /sessoes`, `POST /sessoes/:id/mensagens`,
 * `GET /sessoes/:id/stream` (SSE), `GET /health`. Receives only
 * pre-authenticated requests from apps/api (doc: "the agent should
 * receive pre-authenticated requests and should not be the component
 * that validates user tokens") — `workspaceId` in every body/query below
 * is trusted as already resolved by that caller, the same trust boundary
 * packages/mcp's McpToolContext and packages/agent-runtime's
 * buildCopilotToolDefinitions already assume from their own callers.
 *
 * Not run against a real ANTHROPIC_API_KEY, real Postgres, or inside an
 * actual container in this sandbox session — the routing/validation
 * logic is real and unit-tested (__tests__/server.test.ts), but the
 * query() call itself (the only part that needs those three) is not
 * verified end-to-end here. Disclosed, not silently assumed working.
 */

const MENSAGENS_ROUTE_PATTERN = /^\/sessoes\/([^/]+)\/mensagens$/;
const STREAM_ROUTE_PATTERN = /^\/sessoes\/([^/]+)\/stream$/;

const sessionRequestSchema = z.object({
  workspaceId: z.string().min(1),
  prompt: z.string().min(1),
  actorRef: z.string().min(1).default("copiloto-runtime"),
  maxTurns: z.number().int().positive().max(50).default(20),
});

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

const ANTHROPIC_API_KEY_MISSING_MESSAGE =
  "ANTHROPIC_API_KEY is not configured for this container.";

class RuntimeConfigError extends Error {}

/**
 * Runs one query() call end-to-end (not streamed) and reduces it to the
 * fields a caller needs: the session id (present on every result message
 * regardless of outcome) and the final result/error. Shared by
 * POST /sessoes and POST /sessoes/:id/mensagens — the only difference
 * between "start" and "continue" is whether `resume` is set.
 */
// Placeholder phase until Fase 5's Camada 1 orchestrator assigns a real
// FaseAtivacao/AGENT_FLOW_PHASES value per call — today every session
// through this route is a free-standing query(), not yet slotted into
// either machine, so AgentRun.phase records that honestly instead of
// guessing one of the two enums.
const UNASSIGNED_PHASE = "SESSAO_LIVRE";

const runQuery = async (
  parsed: z.infer<typeof sessionRequestSchema>,
  resume?: string
) => {
  if (!env.ANTHROPIC_API_KEY) {
    throw new RuntimeConfigError(ANTHROPIC_API_KEY_MISSING_MESSAGE);
  }

  const { workspaceId, prompt, actorRef, maxTurns } = parsed;
  const tenantOptions = buildTenantQueryOptions(workspaceId);
  const sessionStore = createPostgresSessionStore(workspaceId);
  const mcpServer = buildCopilotMcpServer(workspaceId, actorRef);
  const agentRunId = await createAgentRun(workspaceId, UNASSIGNED_PHASE, {
    prompt,
    resume: resume ?? null,
  });

  let sessionId: string | undefined;
  let result: string | undefined;
  let subtype = "unknown";

  try {
    for await (const message of query({
      prompt,
      options: {
        ...tenantOptions,
        resume,
        sessionStore,
        maxTurns,
        mcpServers: { "executar-copiloto": mcpServer },
        allowedTools: [...COPILOT_MCP_TOOL_NAMES],
        hooks: buildAgentHooks(workspaceId, agentRunId),
      },
    })) {
      if (message.type === "result") {
        sessionId = message.session_id;
        subtype = message.subtype;
        if (message.subtype === "success") {
          result = message.result;
        }
      }
    }
  } catch (error) {
    // A single-shot query() throws after yielding an error result — the
    // loop above already captured sessionId/subtype when that happened
    // (doc's own documented pattern, mirrored here). Re-throw only if no
    // result message was ever seen (a connection/process failure).
    if (sessionId === undefined) {
      await finishAgentRun(workspaceId, agentRunId, "FAILED", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  await finishAgentRun(
    workspaceId,
    agentRunId,
    subtype === "success" ? "SUCCESS" : "FAILED",
    { subtype, result }
  );

  return { sessionId, subtype, result };
};

const errorResponse = (error: unknown): Response => {
  if (error instanceof RuntimeConfigError) {
    return jsonResponse({ error: error.message }, { status: 503 });
  }
  return jsonResponse(
    { error: error instanceof Error ? error.message : String(error) },
    { status: 502 }
  );
};

const parseSessionRequest = async (
  request: Request
): Promise<
  | { ok: true; data: z.infer<typeof sessionRequestSchema> }
  | { ok: false; response: Response }
> => {
  const parsed = sessionRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonResponse(
        { error: parsed.error.flatten() },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: parsed.data };
};

const handleHealth = (): Response => jsonResponse({ status: "ok" });

const handleCreateSession = async (request: Request): Promise<Response> => {
  const parsed = await parseSessionRequest(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  try {
    return jsonResponse(await runQuery(parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
};

const handleContinueSession = async (
  request: Request,
  sessionId: string
): Promise<Response> => {
  const parsed = await parseSessionRequest(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  try {
    return jsonResponse(await runQuery(parsed.data, sessionId));
  } catch (error) {
    return errorResponse(error);
  }
};

const handleStream = (url: URL, sessionId: string): Response => {
  const workspaceId = url.searchParams.get("workspaceId");
  const prompt = url.searchParams.get("prompt");
  if (!(workspaceId && prompt)) {
    return jsonResponse(
      { error: "workspaceId and prompt query params are required" },
      { status: 400 }
    );
  }
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(
      { error: ANTHROPIC_API_KEY_MISSING_MESSAGE },
      { status: 503 }
    );
  }

  const tenantOptions = buildTenantQueryOptions(workspaceId);
  const sessionStore = createPostgresSessionStore(workspaceId);
  const mcpServer = buildCopilotMcpServer(workspaceId, "copiloto-runtime");

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let agentRunId: string | undefined;
      try {
        agentRunId = await createAgentRun(workspaceId, UNASSIGNED_PHASE, {
          prompt,
          resume: sessionId,
        });
        for await (const message of query({
          prompt,
          options: {
            ...tenantOptions,
            resume: sessionId,
            sessionStore,
            mcpServers: { "executar-copiloto": mcpServer },
            allowedTools: [...COPILOT_MCP_TOOL_NAMES],
            hooks: buildAgentHooks(workspaceId, agentRunId),
          },
        })) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
        }
        if (agentRunId) {
          await finishAgentRun(workspaceId, agentRunId, "SUCCESS", null);
        }
      } catch (error) {
        if (agentRunId) {
          await finishAgentRun(workspaceId, agentRunId, "FAILED", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
};

export const handleRequest = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return handleHealth();
  }

  if (request.method === "POST" && url.pathname === "/sessoes") {
    return await handleCreateSession(request);
  }

  const resumeMatch = url.pathname.match(MENSAGENS_ROUTE_PATTERN);
  if (request.method === "POST" && resumeMatch) {
    return await handleContinueSession(request, resumeMatch[1]);
  }

  const streamMatch = url.pathname.match(STREAM_ROUTE_PATTERN);
  if (request.method === "GET" && streamMatch) {
    return handleStream(url, streamMatch[1]);
  }

  return jsonResponse({ error: "Not found" }, { status: 404 });
};

if (import.meta.main) {
  const server = Bun.serve({
    port: env.COPILOTO_RUNTIME_PORT,
    fetch: handleRequest,
  });
  console.log(`copiloto-runtime listening on :${server.port}`);
}
