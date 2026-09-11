-- Fase 3 (D2/ADR-004): backing store for apps/copiloto-runtime's
-- SessionStore adapter (docs.claude.com/en/agent-sdk/session-storage).
-- AgentSessionEntry is the append-only transcript mirror; AgentSessionSummary
-- is the per-session foldSessionSummary() sidecar the SDK reads for
-- listSessionSummaries(). Same workspace_isolation RLS shape every other
-- tenant-scoped table got in 20260909173722_enable_rls.
--
-- Not applied against any real database by this session (sandbox has no
-- DATABASE_URL/Neon access) — hand-authored to match what `prisma migrate
-- dev` would generate from the schema.prisma additions in this same
-- commit, following 20260910105939_telemetry_events's exact pattern for
-- a table with this shape. Apply with `bun run migrate:deploy` against a
-- real database before Fase 3's container can actually persist sessions.

CREATE TABLE "AgentSessionEntry" (
  "id" BIGSERIAL NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectKey" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "subpath" TEXT,
  "entryUuid" TEXT,
  "entry" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentSessionEntry_pkey" PRIMARY KEY ("id")
);

-- Backs createMany({ skipDuplicates: true })'s ON CONFLICT DO NOTHING in
-- apps/copiloto-runtime/src/session-store.ts. Postgres treats every NULL
-- entryUuid as distinct, so entries without a uuid are never deduped
-- against each other (intentional — see that file's own comment).
CREATE UNIQUE INDEX "AgentSessionEntry_workspaceId_projectKey_sessionId_subpath_entryUuid_key"
  ON "AgentSessionEntry" ("workspaceId", "projectKey", "sessionId", "subpath", "entryUuid");

CREATE INDEX "AgentSessionEntry_workspaceId_projectKey_sessionId_subpath_id_idx"
  ON "AgentSessionEntry" ("workspaceId", "projectKey", "sessionId", "subpath", "id");

ALTER TABLE "AgentSessionEntry"
  ADD CONSTRAINT "AgentSessionEntry_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentSessionEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentSessionEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "AgentSessionEntry"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

CREATE TABLE "AgentSessionSummary" (
  "workspaceId" TEXT NOT NULL,
  "projectKey" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "mtime" BIGINT NOT NULL,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgentSessionSummary_pkey" PRIMARY KEY ("workspaceId", "projectKey", "sessionId")
);

CREATE INDEX "AgentSessionSummary_workspaceId_projectKey_idx"
  ON "AgentSessionSummary" ("workspaceId", "projectKey");

ALTER TABLE "AgentSessionSummary"
  ADD CONSTRAINT "AgentSessionSummary_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentSessionSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentSessionSummary" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "AgentSessionSummary"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));
