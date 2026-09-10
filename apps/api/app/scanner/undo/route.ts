import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { undo } from "@repo/scanner/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const undoSchema = z.object({ mutationId: z.string().min(1) });

/** Undo's network boundary — same auth and DB-split rationale as /scanner/dispatch. */
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

  const parsed = undoSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid body", ok: false },
      { status: 400 }
    );
  }

  const result = await undo(workspaceId, parsed.data.mutationId, actorRef);
  return NextResponse.json(result);
};
