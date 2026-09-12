import { keys } from "../../keys";
import type { OAuthTokenSet } from "../types";

// Calendars.Read rides along with the Outlook consent, same disclosed
// simplification as Gmail's calendar.readonly (see gmail/client.ts) —
// no separate OUTLOOK_CALENDAR connection/connect flow this milestone.
const MICROSOFT_GRAPH_SCOPES = [
  "offline_access",
  "Mail.Read",
  "Mail.Send",
  "User.Read",
  "Calendars.Read",
] as const;

export class OutlookNotConfiguredError extends Error {
  constructor() {
    super(
      "OUTLOOK_CLIENT_ID/OUTLOOK_CLIENT_SECRET/OUTLOOK_REDIRECT_URI are not all configured."
    );
    this.name = "OutlookNotConfiguredError";
  }
}

const requireConfig = () => {
  const config = keys();
  if (
    !(
      config.OUTLOOK_CLIENT_ID &&
      config.OUTLOOK_CLIENT_SECRET &&
      config.OUTLOOK_REDIRECT_URI
    )
  ) {
    throw new OutlookNotConfiguredError();
  }
  return {
    clientId: config.OUTLOOK_CLIENT_ID,
    clientSecret: config.OUTLOOK_CLIENT_SECRET,
    redirectUri: config.OUTLOOK_REDIRECT_URI,
  };
};

/**
 * Microsoft identity platform v2.0 authorize endpoint, `common` tenant
 * (personal + work/school accounts) — the real, documented endpoint,
 * not a placeholder.
 */
export const buildOutlookAuthorizationUrl = (state: string): string => {
  const { clientId, redirectUri } = requireConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_GRAPH_SCOPES.join(" "),
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
};

interface MicrosoftTokenResponse {
  readonly access_token: string;
  readonly error?: string;
  readonly error_description?: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
}

const parseTokenResponse = (body: MicrosoftTokenResponse): OAuthTokenSet => ({
  accessToken: body.access_token,
  refreshToken: body.refresh_token ?? null,
  expiresAt: new Date(Date.now() + body.expires_in * 1000),
});

export const exchangeOutlookAuthorizationCode = async (
  code: string
): Promise<OAuthTokenSet> => {
  const { clientId, clientSecret, redirectUri } = requireConfig();
  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }
  );
  const body = (await response.json()) as MicrosoftTokenResponse;
  if (!response.ok) {
    throw new Error(
      body.error_description ?? body.error ?? `HTTP ${response.status}`
    );
  }
  return parseTokenResponse(body);
};

export const refreshOutlookAccessToken = async (
  refreshToken: string
): Promise<OAuthTokenSet> => {
  const { clientId, clientSecret } = requireConfig();
  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    }
  );
  const body = (await response.json()) as MicrosoftTokenResponse;
  if (!response.ok) {
    throw new Error(
      body.error_description ?? body.error ?? `HTTP ${response.status}`
    );
  }
  return parseTokenResponse(body);
};

/**
 * Real Microsoft Graph /me call — resolves the account a token set
 * belongs to (mail, falling back to userPrincipalName for accounts with
 * no mailbox mail attribute set).
 */
export const getOutlookProfileEmail = async (
  accessToken: string
): Promise<string> => {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Graph /me failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    mail?: string;
    userPrincipalName?: string;
  };
  const email = body.mail ?? body.userPrincipalName;
  if (!email) {
    throw new Error(
      "Graph /me response had no mail or userPrincipalName field."
    );
  }
  return email;
};

export interface OutlookMessageSummary {
  readonly id: string;
  readonly subject: string;
}

/** Real Microsoft Graph call (GET /me/messages). */
export const listOutlookMessages = async (
  accessToken: string
): Promise<readonly OutlookMessageSummary[]> => {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Graph /me/messages failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    value?: ReadonlyArray<{ id: string; subject?: string }>;
  };
  return (body.value ?? []).map((m) => ({
    id: m.id,
    subject: m.subject ?? "",
  }));
};
