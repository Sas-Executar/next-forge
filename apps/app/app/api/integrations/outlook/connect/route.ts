import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import {
  buildOutlookAuthorizationUrl,
  OutlookNotConfiguredError,
  StateSigningKeyMissingError,
  signOAuthState,
} from "@repo/integrations";
import { NextResponse } from "next/server";

/** Initiates the Outlook/Microsoft 365 OAuth flow (M11-T03). OWNER-only, same rationale as the Gmail connect route. */
export const GET = async (): Promise<Response> => {
  try {
    const { workspace } = await requireRole("OWNER");
    const state = signOAuthState(workspace.id);
    return NextResponse.redirect(buildOutlookAuthorizationUrl(state));
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
      error instanceof OutlookNotConfiguredError ||
      error instanceof StateSigningKeyMissingError
    ) {
      return NextResponse.json({ message: "Not configured", ok: false });
    }
    throw error;
  }
};
