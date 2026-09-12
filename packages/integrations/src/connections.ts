import "server-only";
import {
  forSystemJob,
  forWorkspace,
  type IntegrationConnection,
  type IntegrationProvider,
  type Prisma,
} from "@repo/database";
import { decryptToken, encryptToken } from "./crypto";
import type { OAuthTokenSet } from "./types";

export class ConnectionNotFoundError extends Error {
  constructor(provider: IntegrationProvider, workspaceId: string) {
    super(`No ${provider} IntegrationConnection for workspace ${workspaceId}.`);
    this.name = "ConnectionNotFoundError";
  }
}

/**
 * Cross-tenant discovery: resolves which workspace+connection an
 * inbound webhook event belongs to, keyed by the provider's own
 * external account identifier (a WhatsApp phone_number_id, a Gmail
 * address, a Graph subscription's resource owner) — the identifier is
 * all an inbound webhook carries, never a workspaceId.
 *
 * Uses forSystemJob() (packages/database/rls.ts) plus the
 * system_job_discovery policy added on IntegrationConnection
 * (M11-T06 migration) — the exact same shape as the M10 routines
 * scheduler's cross-tenant Routine discovery. Read-only: every
 * subsequent operation on the resolved connection goes through
 * forWorkspace(connection.workspaceId), never this client.
 */
export const resolveConnectionByExternalAccount = async (
  provider: IntegrationProvider,
  externalAccountId: string
): Promise<IntegrationConnection | null> => {
  const db = forSystemJob();
  return await db.integrationConnection.findFirst({
    where: { provider, externalAccountId },
  });
};

/**
 * Workspace-scoped read of one provider's connection, decrypting its
 * stored tokens. Returns null (not an error) when the workspace has
 * never connected that provider — every caller decides how to degrade,
 * matching M06/M10's "no config" pattern rather than throwing for an
 * ordinary, expected state.
 */
export const getConnection = async (
  workspaceId: string,
  provider: IntegrationProvider
): Promise<
  (IntegrationConnection & { readonly tokens: OAuthTokenSet | null }) | null
> => {
  const db = forWorkspace(workspaceId);
  const connection = await db.integrationConnection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider } },
  });
  if (!connection) {
    return null;
  }
  const tokens: OAuthTokenSet | null = connection.accessTokenEncrypted
    ? {
        accessToken: decryptToken(connection.accessTokenEncrypted),
        refreshToken: connection.refreshTokenEncrypted
          ? decryptToken(connection.refreshTokenEncrypted)
          : null,
        expiresAt: connection.tokenExpiresAt,
      }
    : null;
  return { ...connection, tokens };
};

/**
 * Upserts a connection after a successful OAuth exchange (or, for
 * WhatsApp's System User model, after an admin activates the
 * integration with an already-issued token) — tokens are encrypted
 * before the write, never stored as the plaintext the provider handed
 * back.
 */
export const upsertConnection = async (
  workspaceId: string,
  provider: IntegrationProvider,
  input: {
    readonly externalAccountId: string;
    readonly tokens?: OAuthTokenSet;
    readonly scopes?: readonly string[];
    readonly webhookSecret?: string;
  }
): Promise<IntegrationConnection> => {
  const db = forWorkspace(workspaceId);
  return await db.integrationConnection.upsert({
    where: { workspaceId_provider: { workspaceId, provider } },
    create: {
      workspaceId,
      provider,
      status: "CONNECTED",
      externalAccountId: input.externalAccountId,
      scopes: input.scopes as unknown as Prisma.InputJsonValue | undefined,
      accessTokenEncrypted: input.tokens
        ? encryptToken(input.tokens.accessToken)
        : undefined,
      refreshTokenEncrypted: input.tokens?.refreshToken
        ? encryptToken(input.tokens.refreshToken)
        : undefined,
      tokenExpiresAt: input.tokens?.expiresAt ?? undefined,
      webhookSecret: input.webhookSecret,
    },
    update: {
      status: "CONNECTED",
      externalAccountId: input.externalAccountId,
      scopes: input.scopes as unknown as Prisma.InputJsonValue | undefined,
      accessTokenEncrypted: input.tokens
        ? encryptToken(input.tokens.accessToken)
        : undefined,
      refreshTokenEncrypted: input.tokens?.refreshToken
        ? encryptToken(input.tokens.refreshToken)
        : undefined,
      tokenExpiresAt: input.tokens?.expiresAt ?? undefined,
      webhookSecret: input.webhookSecret,
    },
  });
};

export const disconnectConnection = async (
  workspaceId: string,
  provider: IntegrationProvider
): Promise<void> => {
  const db = forWorkspace(workspaceId);
  await db.integrationConnection.update({
    where: { workspaceId_provider: { workspaceId, provider } },
    data: {
      status: "DISCONNECTED",
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      tokenExpiresAt: null,
    },
  });
};
