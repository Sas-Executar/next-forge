import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import {
  buildGmailAuthorizationUrl,
  GmailNotConfiguredError,
  StateSigningKeyMissingError,
  signOAuthState,
} from "@repo/integrations";
import { NextResponse } from "next/server";

/**
 * Initiates the Gmail OAuth flow (M11-T02). OWNER-only: connecting an
 * integration is a workspace-level credential decision, not something
 * any MEMBER should trigger — same rank check as every other
 * requireRole() call site in this repo, still the provisional 2-role
 * model pending M16-T01's real permission matrix.
 */
export const GET = async (): Promise<Response> => {
  try {
    const { workspace } = await requireRole("OWNER");
    const state = signOAuthState(workspace.id);
    return NextResponse.redirect(buildGmailAuthorizationUrl(state));
  } catch (error) {
    if (
      error instanceof NoActiveOrganizationError ||
      error instanceof WorkspaceNotFoundError
    ) {
      return new Response("No active workspace", { status: 409 });
    }
    if (error instanceof InsufficientRoleError) {
      return new Response("Requires OWNER role", { status: 403 });
    }
    if (
      error instanceof GmailNotConfiguredError ||
      error instanceof StateSigningKeyMissingError
    ) {
      return NextResponse.json({ message: "Not configured", ok: false });
    }
    throw error;
  }
};
