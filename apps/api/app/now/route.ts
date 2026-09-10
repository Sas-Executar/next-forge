import { nextAction } from "@repo/application";
import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { NextResponse } from "next/server";

/**
 * M21 — apps/mobile's network boundary for "Agora" (mirrors apps/app's
 * /now page). `@repo/application` is server-only (imports
 * `@repo/database`), so apps/mobile can't call `nextAction()` directly —
 * same split every other apps/api adapter route in this repo already
 * uses (see /scanner/dispatch's own comment on why).
 */
export const GET = async (): Promise<Response> => {
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

  const result = await nextAction(workspaceId);
  return NextResponse.json(result);
};
