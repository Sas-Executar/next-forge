import type {
  HookCallback,
  HookCallbackMatcher,
  HookEvent,
  PostToolUseFailureHookInput,
  PostToolUseHookInput,
  PreToolUseHookInput,
} from "@anthropic-ai/claude-agent-sdk";
import { COPILOT_MCP_TOOL_NAMES } from "@repo/agent-runtime";
import { forWorkspace, type Prisma } from "@repo/database";

/**
 * Fase 4 (D2/ADR-004, plano §6.5) — hooks e trilha de auditoria do
 * runtime. Reusa models Prisma já existentes desde M06/M12 (`AgentRun`,
 * `ToolCall`, `AuditEvent`) — nenhum schema novo, só o código do Agent
 * SDK escrevendo neles pela primeira vez, exatamente como
 * docs/executar/PLANO_OBSERVABILIDADE_OPERACAO.md já previa para esta
 * fase.
 *
 * `PreToolUse`/`PostToolUse`/`PostToolUseFailure` — não verificados
 * contra uma sessão real do Agent SDK nesta sessão sandbox (mesma
 * limitação de src/server.ts e src/session-store.ts: sem
 * ANTHROPIC_API_KEY/Postgres reais aqui). A lógica de decisão do
 * PreToolUse é testada diretamente (__tests__/hooks.test.ts, chamando o
 * HookCallback como função pura sobre um input fabricado), sem precisar
 * de uma sessão real do SDK para isso.
 */

export const createAgentRun = async (
  workspaceId: string,
  phase: string,
  input: unknown
): Promise<string> => {
  const db = forWorkspace(workspaceId);
  const run = await db.agentRun.create({
    data: {
      workspaceId,
      phase,
      input: input as Prisma.InputJsonValue,
    },
  });
  return run.id;
};

export const finishAgentRun = async (
  workspaceId: string,
  agentRunId: string,
  status: "SUCCESS" | "PARTIAL" | "BLOCKED" | "FAILED",
  output: unknown
): Promise<void> => {
  const db = forWorkspace(workspaceId);
  await db.agentRun.update({
    where: { id: agentRunId },
    data: {
      status,
      output: output as Prisma.InputJsonValue,
      finishedAt: new Date(),
    },
  });
};

const QUALIFIED_TOOL_NAMES = new Set<string>(COPILOT_MCP_TOOL_NAMES);

/**
 * Denies any tool call whose name isn't in this agent's own allowlist —
 * defense in depth *beyond* `options.allowedTools` (which the SDK
 * already enforces): a hook denial is a second, independent check that
 * doesn't rely on the same option object staying correct. This is the
 * concrete, generic form of the plan's "executar-scanner não consegue
 * gravar" negative test: today there is no scanner MCP tool at all
 * (Fase 8 territory), so the closest real guarantee this fase can ship
 * is "no tool outside the explicit allowlist runs, full stop" — a
 * strictly stronger property that subsumes the scanner-specific one
 * once that tool exists.
 */
const buildPreToolUseHook = (): HookCallback => (input) => {
  const preInput = input as PreToolUseHookInput;
  if (!QUALIFIED_TOOL_NAMES.has(preInput.tool_name)) {
    return Promise.resolve({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `"${preInput.tool_name}" não está na allowlist deste agente.`,
      },
    });
  }
  return Promise.resolve({});
};

const buildPostToolUseHook = (
  workspaceId: string,
  agentRunId: string
): HookCallback => {
  const db = forWorkspace(workspaceId);
  return async (input) => {
    const postInput = input as PostToolUseHookInput;
    await db.$transaction([
      db.toolCall.create({
        data: {
          workspaceId,
          agentRunId,
          toolName: postInput.tool_name,
          input: postInput.tool_input as Prisma.InputJsonValue,
          output: postInput.tool_response as Prisma.InputJsonValue,
          status: "SUCCESS",
        },
      }),
      db.auditEvent.create({
        data: {
          workspaceId,
          actorType: "AGENT",
          action: "MCP_TOOL_CALL",
          objectType: "McpTool",
          objectId: postInput.tool_name,
          authorityRuleId: `mcp:${postInput.tool_name}`,
          // Same cast packages/mcp/src/server.ts's logToolCall uses: a
          // generic object literal built from unknown input isn't
          // structurally assignable to Prisma's InputJsonValue.
          metadata: {
            input: postInput.tool_input,
            ok: true,
          } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);
    return {};
  };
};

const buildPostToolUseFailureHook = (
  workspaceId: string,
  agentRunId: string
): HookCallback => {
  const db = forWorkspace(workspaceId);
  return async (input) => {
    const failInput = input as PostToolUseFailureHookInput;
    await db.$transaction([
      db.toolCall.create({
        data: {
          workspaceId,
          agentRunId,
          toolName: failInput.tool_name,
          input: failInput.tool_input as Prisma.InputJsonValue,
          output: { error: failInput.error } as Prisma.InputJsonValue,
          status: "FAILED",
        },
      }),
      db.auditEvent.create({
        data: {
          workspaceId,
          actorType: "AGENT",
          action: "MCP_TOOL_CALL",
          objectType: "McpTool",
          objectId: failInput.tool_name,
          authorityRuleId: `mcp:${failInput.tool_name}`,
          metadata: {
            input: failInput.tool_input,
            ok: false,
            error: failInput.error,
          } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);
    return {};
  };
};

export const buildAgentHooks = (
  workspaceId: string,
  agentRunId: string
): Partial<Record<HookEvent, HookCallbackMatcher[]>> => ({
  PreToolUse: [{ hooks: [buildPreToolUseHook()] }],
  PostToolUse: [{ hooks: [buildPostToolUseHook(workspaceId, agentRunId)] }],
  PostToolUseFailure: [
    { hooks: [buildPostToolUseFailureHook(workspaceId, agentRunId)] },
  ],
});
