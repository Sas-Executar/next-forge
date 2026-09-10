import {
  runPrimaryCommand,
  validateOrchestratorOutput,
} from "@repo/agent-runtime";
import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Only the 4 commands runnable from a single workspaceId argument
// (matches runPrimaryCommand's own `Exclude<PrimaryCommandId,
// "replanejamento">` parameter type) — a request for "replanejamento"
// fails this zod check with a clean 400 rather than a TS-level mismatch
// at runtime. /replanejamento (two-step propose/confirm) and free-form
// AI chat (apps/app's /api/chat `streamText` branch, needs
// OPENAI_API_KEY) are both a disclosed M21 scope cut for mobile —
// porting @repo/ai's streaming useChat to React Native is a materially
// bigger UI lift than the other 4 mobile screens combined, and these 4
// deterministic commands already make the Copilot tab real without it.
// This route never touches @repo/ai and needs no OPENAI_API_KEY at all.
const commandSchema = z.object({
  commandId: z.enum(["bomdia", "agora", "estado", "fechardia"]),
});

export const POST = async (request: Request): Promise<Response> => {
  let workspaceId: string;
  try {
    const { workspace } = await requireRole("MEMBER");
    workspaceId = workspace.id;
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

  const parsed = commandSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid body", ok: false },
      { status: 400 }
    );
  }

  const output = validateOrchestratorOutput(
    await runPrimaryCommand(parsed.data.commandId, workspaceId)
  );
  return NextResponse.json(output);
};
