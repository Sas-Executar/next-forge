import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { dispatch } from "@repo/scanner/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const dispatchSchema = z.object({ symbolId: z.string().min(1) });

/**
 * CommandDispatcher's network boundary (M09-T02/T04) — apps/mobile's
 * scanner-pipeline.ts POSTs here once ScanEventLatch fires (real
 * dispatch/domain-mutation logic lives server-side in
 * @repo/scanner/server, which needs a live DB connection this app has
 * and a React Native bundle doesn't — see packages/scanner/index.ts's
 * own comment on that split). Same Clerk Bearer-token auth M08-T03's
 * /notifications/register-device route established for apps/api.
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

  const parsed = dispatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid body", ok: false },
      { status: 400 }
    );
  }

  const result = await dispatch(workspaceId, parsed.data.symbolId, actorRef);
  return NextResponse.json(result);
};
