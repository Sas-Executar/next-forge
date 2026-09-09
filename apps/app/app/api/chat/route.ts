import {
  buildCopilotTools,
  COMMAND_SLASH_MAP,
  COPILOT_SYSTEM_PROMPT,
  formatOrchestratorOutputText,
  runPrimaryCommand,
  validateOrchestratorOutput,
} from "@repo/agent-runtime";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "@repo/ai";
import { keys as aiKeys } from "@repo/ai/keys";
import { routeModel } from "@repo/ai/router";
import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";

const WHITESPACE = /\s/;

const textFromMessage = (message: UIMessage | undefined): string =>
  message?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim() ?? "";

/** Renders a fixed, non-streamed assistant text turn — used both for the
 * 5 deterministic slash commands and for the "no API key configured"
 * fallback, so neither path needs a live model call to produce a valid
 * chat response. */
const staticTextResponse = (text: string): Response =>
  createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        const id = crypto.randomUUID();
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: text });
        writer.write({ type: "text-end", id });
        writer.write({ type: "finish" });
      },
    }),
  });

/**
 * Copilot chat endpoint (M06-T04). Two paths:
 *
 * 1. One of the 5 fixed slash commands (SKILL.md, references/commands.md)
 *    as the message's first token — routed directly to the matching
 *    agent-runtime command, deterministic, no model call. This is what
 *    SKILL.md's "resposta diária curta e acionável" fixed block actually
 *    asks for, and it's what stays testable without a live API key.
 * 2. Anything else — free-form chat, streamed from a real model with
 *    tool-calling over the same commands plus the propose/confirm
 *    replanejamento pair (agent-runtime/src/tools.ts), per AGENT-FLOW-001.
 *
 * /replanejamento is deliberately excluded from the slash-command
 * shortcut: it needs a structured proposal (deliverable + tasks), which
 * free text alone doesn't reliably carry — it always goes through the
 * model's tool-calling path so the model can extract that structure from
 * the conversation.
 */
export const POST = async (req: Request) => {
  let workspaceId: string;
  let confirmedByActorRef: string;
  try {
    const { workspace, membership } = await requireRole("MEMBER");
    workspaceId = workspace.id;
    confirmedByActorRef = membership.clerkUserId;
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

  const { messages }: { messages: UIMessage[] } = await req.json();
  const lastText = textFromMessage(messages.at(-1));
  const firstToken = lastText.split(WHITESPACE, 1)[0]?.toLowerCase();
  const commandId = firstToken ? COMMAND_SLASH_MAP[firstToken] : undefined;

  if (commandId && commandId !== "replanejamento") {
    const output = validateOrchestratorOutput(
      await runPrimaryCommand(commandId, workspaceId)
    );
    return staticTextResponse(formatOrchestratorOutputText(output));
  }

  if (!aiKeys().OPENAI_API_KEY) {
    return staticTextResponse(
      "O Copiloto não tem uma chave de modelo configurada (OPENAI_API_KEY) — " +
        "os comandos fixos (/bomdia, /agora, /estado, /fechardia) continuam " +
        "funcionando sem ela; conversas livres e /replanejamento precisam dela."
    );
  }

  const tools = buildCopilotTools(workspaceId, confirmedByActorRef);
  const result = streamText({
    model: routeModel("structuring"),
    system: COPILOT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
};
