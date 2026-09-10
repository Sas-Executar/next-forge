import { keys } from "../../keys";
import type { OAuthTokenSet } from "../types";

// calendar.readonly rides along with the Gmail consent (M11-T04): this
// repo doesn't create a separate GOOGLE_CALENDAR IntegrationConnection
// or its own connect flow this milestone — calendar/google-calendar.ts
// takes an access token directly, and the intended caller is whatever
// later resolves a workspace's GMAIL connection's token (Google allows
// requesting Calendar scope alongside Mail scope in one consent grant).
const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export class GmailNotConfiguredError extends Error {
  constructor() {
    super(
      "GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REDIRECT_URI are not all configured."
    );
    this.name = "GmailNotConfiguredError";
  }
}

const requireConfig = () => {
  const config = keys();
  if (
    !(
      config.GMAIL_CLIENT_ID &&
      config.GMAIL_CLIENT_SECRET &&
      config.GMAIL_REDIRECT_URI
    )
  ) {
    throw new GmailNotConfiguredError();
  }
  return {
    clientId: config.GMAIL_CLIENT_ID,
    clientSecret: config.GMAIL_CLIENT_SECRET,
    redirectUri: config.GMAIL_REDIRECT_URI,
  };
};

/** Google's real OAuth 2.0 authorization endpoint (accounts.google.com). */
export const buildGmailAuthorizationUrl = (state: string): string => {
  const { clientId, redirectUri } = requireConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

interface GoogleTokenResponse {
  readonly access_token: string;
  readonly error?: string;
  readonly error_description?: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
}

const parseTokenResponse = (body: GoogleTokenResponse): OAuthTokenSet => ({
  accessToken: body.access_token,
  refreshToken: body.refresh_token ?? null,
  expiresAt: new Date(Date.now() + body.expires_in * 1000),
});

/** Real token exchange against Google's OAuth 2.0 token endpoint. */
export const exchangeGmailAuthorizationCode = async (
  code: string
): Promise<OAuthTokenSet> => {
  const { clientId, clientSecret, redirectUri } = requireConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const body = (await response.json()) as GoogleTokenResponse;
  if (!response.ok) {
    throw new Error(
      body.error_description ?? body.error ?? `HTTP ${response.status}`
    );
  }
  return parseTokenResponse(body);
};

export const refreshGmailAccessToken = async (
  refreshToken: string
): Promise<OAuthTokenSet> => {
  const { clientId, clientSecret } = requireConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const body = (await response.json()) as GoogleTokenResponse;
  if (!response.ok) {
    throw new Error(
      body.error_description ?? body.error ?? `HTTP ${response.status}`
    );
  }
  // Google's refresh grant does not re-issue a refresh_token — the
  // caller must keep the original.
  return { ...parseTokenResponse(body), refreshToken };
};

/**
 * Real Google userinfo call — resolves the Gmail address a token set
 * belongs to, which is what IntegrationConnection.externalAccountId
 * stores (and what resolveConnectionByExternalAccount() later looks up
 * inbound Pub/Sub notifications against).
 */
export const getGmailProfileEmail = async (
  accessToken: string
): Promise<string> => {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) {
    throw new Error(`Google userinfo failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { email?: string };
  if (!body.email) {
    throw new Error("Google userinfo response had no email field.");
  }
  return body.email;
};

export interface GmailMessageSummary {
  readonly id: string;
  readonly snippet: string;
  readonly threadId: string;
}

/**
 * Real Gmail REST API call (users.messages.list), the `history.list`
 * delta endpoint referenced by the Pub/Sub push payload's historyId is
 * intentionally not implemented here — a full incremental-sync
 * implementation needs persisted per-connection historyId cursors this
 * package does not yet track (disclosed gap, M11 ships webhook receipt
 * + normalization, not full mailbox sync).
 */
export const listGmailMessages = async (
  accessToken: string,
  query: string
): Promise<readonly GmailMessageSummary[]> => {
  const url = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages"
  );
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Gmail messages.list failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    messages?: ReadonlyArray<{ id: string; threadId: string }>;
  };
  return (body.messages ?? []).map((m) => ({
    id: m.id,
    threadId: m.threadId,
    snippet: "",
  }));
};
