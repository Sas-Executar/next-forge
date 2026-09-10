import { requireWorkspace } from "@repo/auth/server";
import {
  exchangeGmailAuthorizationCode,
  getGmailProfileEmail,
  upsertConnection,
  verifyOAuthState,
} from "@repo/integrations";
import { NextResponse } from "next/server";

/**
 * Google's OAuth redirect target (M11-T02). Verifies `state` against
 * the workspace that initiated /api/integrations/gmail/connect (CSRF
 * protection, packages/integrations/src/oauth-state.ts), then also
 * confirms the *current* signed-in session still resolves to that same
 * workspace — a state signature alone proves the link wasn't forged,
 * not that the browser completing it is still the same session that
 * started it.
 */
export const GET = async (request: Request): Promise<Response> => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return new Response(`Gmail authorization denied: ${oauthError}`, {
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

  const tokens = await exchangeGmailAuthorizationCode(code);
  const email = await getGmailProfileEmail(tokens.accessToken);

  await upsertConnection(workspace.id, "GMAIL", {
    externalAccountId: email,
    tokens,
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  });

  return NextResponse.redirect(new URL("/integrations", request.url));
};
