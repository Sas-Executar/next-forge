import { requireWorkspace } from "@repo/auth/server";
import {
  exchangeOutlookAuthorizationCode,
  getOutlookProfileEmail,
  upsertConnection,
  verifyOAuthState,
} from "@repo/integrations";
import { NextResponse } from "next/server";

/** Microsoft's OAuth redirect target (M11-T03) — same CSRF/session-match shape as the Gmail callback. */
export const GET = async (request: Request): Promise<Response> => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return new Response(`Outlook authorization denied: ${oauthError}`, {
      status: 400,
    });
  }
  if (!(code && state)) {
    return new Response("Missing code or state.", { status: 400 });
  }

  const stateWorkspaceId = verifyOAuthState(state);
  if (!stateWorkspaceId) {
    return new Response("Invalid or tampered state.", { status: 400 });
  }

  const workspace = await requireWorkspace();
  if (workspace.id !== stateWorkspaceId) {
    return new Response(
      "State does not match the current session's workspace.",
      {
        status: 403,
      }
    );
  }

  const tokens = await exchangeOutlookAuthorizationCode(code);
  const email = await getOutlookProfileEmail(tokens.accessToken);

  await upsertConnection(workspace.id, "OUTLOOK", {
    externalAccountId: email,
    tokens,
    scopes: ["Mail.Read", "Mail.Send"],
  });

  return NextResponse.redirect(new URL("/integrations", request.url));
};
