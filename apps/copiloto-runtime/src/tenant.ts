import { env } from "../env";

/**
 * Fase 3 — multi-tenant isolation for query() calls, per
 * docs.claude.com/en/agent-sdk/hosting "Multi-tenant isolation":
 * settingSources: [] (skip user/project/local settings), a per-tenant
 * CLAUDE_CONFIG_DIR (no shared ~/.claude.json), CLAUDE_CODE_DISABLE_AUTO_MEMORY
 * (auto memory loads regardless of settingSources), and a per-tenant cwd
 * passed explicitly on every query() call — never the container's own
 * process.cwd().
 *
 * `projectKey` (packages/database's AgentSessionEntry/AgentSessionSummary,
 * the Postgres SessionStore's addressing scheme) is a stable encoding
 * the SDK derives from `cwd`. Because this function always builds `cwd`
 * as a deterministic function of `workspaceId` alone, every session for
 * the same workspace lands under the same `projectKey` — which is what
 * lets a workspace-scoped SessionStore instance (session-store.ts) find
 * its own prior sessions without needing to decode the SDK's own
 * encoding.
 */
export interface TenantQueryOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  settingSources: [];
}

const SAFE_PATH_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;

const sanitizeWorkspaceId = (workspaceId: string): string => {
  if (workspaceId.length === 0) {
    throw new Error("workspaceId must not be empty");
  }
  // Workspace ids are cuid()s (packages/database/prisma/schema.prisma) —
  // alphanumeric only, never containing path separators. Rejecting
  // anything else here is a defense-in-depth check against a malformed
  // or forged id reaching a filesystem path, not the primary guard
  // (the primary guard is that workspaceId is resolved by apps/api's own
  // auth, per D9's "tenant_id from the server's closure" rule — this
  // function is one layer further in, so it checks its own input too).
  if (!SAFE_PATH_SEGMENT_PATTERN.test(workspaceId)) {
    throw new Error(`workspaceId "${workspaceId}" is not a safe path segment`);
  }
  return workspaceId;
};

export const buildTenantQueryOptions = (
  workspaceId: string
): TenantQueryOptions => {
  const safeId = sanitizeWorkspaceId(workspaceId);
  return {
    cwd: `${env.COPILOTO_RUNTIME_WORK_DIR}/${safeId}`,
    settingSources: [],
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: `${env.COPILOTO_RUNTIME_CONFIG_DIR}/${safeId}`,
      CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
    },
  };
};
