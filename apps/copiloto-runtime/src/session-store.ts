import {
  foldSessionSummary,
  type SessionKey,
  type SessionStore,
  type SessionStoreEntry,
  type SessionSummaryEntry,
} from "@anthropic-ai/claude-agent-sdk";
import { forWorkspace, type Prisma } from "@repo/database";

/**
 * Fase 3 (D2/ADR-004) — Postgres-backed SessionStore adapter, required
 * by the "hybrid sessions" pattern this container uses (doc: "Shutting
 * a container down without a SessionStore configured loses the
 * transcript with it, so the store is required for this pattern, not
 * optional"). Backed by AgentSessionEntry (append-only transcript
 * mirror) and AgentSessionSummary (the foldSessionSummary() sidecar),
 * both added to schema.prisma in this same phase — see that file's own
 * comments for the RLS/tenancy rationale.
 *
 * One instance per workspace (closure-scoped), same pattern as
 * packages/mcp's buildMcpServer(ctx) and packages/agent-runtime's
 * buildCopilotToolDefinitions(workspaceId, ...): workspaceId never
 * travels through SessionKey (the SDK doesn't know it exists), so it
 * can't be forged by anything the SDK/model controls.
 *
 * NOT verified against a real Postgres in this sandbox session (no
 * DATABASE_URL) — see __tests__/session-store.test.ts's own
 * describe.skipIf for the same limitation every other DB-backed suite
 * in this repo already discloses.
 */
export const createPostgresSessionStore = (
  workspaceId: string
): SessionStore => {
  const db = forWorkspace(workspaceId);

  const summaryKey = (key: SessionKey) => ({
    workspaceId_projectKey_sessionId: {
      workspaceId,
      projectKey: key.projectKey,
      sessionId: key.sessionId,
    },
  });

  /**
   * Subagent transcripts (key.subpath set) must not contribute to the
   * main session's summary — explicit rule from the SDK's own doc
   * ("Skip batches whose key has a subpath"). Concurrent append() calls
   * for the same session can race on this sidecar (also documented); a
   * transaction around read-fold-write is this adapter's serialization
   * strategy, matching the doc's own suggested options ("a transaction,
   * a compare-and-swap, or a per-session lock").
   */
  const upsertSummary = async (
    key: SessionKey,
    entries: SessionStoreEntry[]
  ): Promise<void> => {
    if (key.subpath) {
      return;
    }

    await db.$transaction(async (tx) => {
      const existing = await tx.agentSessionSummary.findUnique({
        where: summaryKey(key),
      });
      const prev: SessionSummaryEntry | undefined = existing
        ? {
            sessionId: existing.sessionId,
            mtime: Number(existing.mtime),
            data: existing.data as Record<string, unknown>,
          }
        : undefined;

      const folded = foldSessionSummary(prev, key, entries, {
        mtime: Date.now(),
      });

      await tx.agentSessionSummary.upsert({
        where: summaryKey(key),
        create: {
          workspaceId,
          projectKey: key.projectKey,
          sessionId: key.sessionId,
          mtime: BigInt(folded.mtime),
          data: folded.data as unknown as Prisma.InputJsonValue,
        },
        update: {
          mtime: BigInt(folded.mtime),
          data: folded.data as unknown as Prisma.InputJsonValue,
        },
      });
    });
  };

  return {
    append: async (key, entries) => {
      if (entries.length === 0) {
        return;
      }

      try {
        // Idempotency per the SDK's own guidance ("treat uuid as an
        // idempotency key ... so that retries ... do not create duplicate
        // rows"): entryUuid + the unique constraint on schema.prisma's
        // AgentSessionEntry let skipDuplicates do this as a single
        // ON CONFLICT DO NOTHING, rather than a separate read-before-write.
        // Entries without a uuid get entryUuid: null, and Postgres treats
        // every NULL as distinct for uniqueness — so those are never
        // deduped against each other, matching the doc's own carve-out
        // ("Entries without a uuid ... should be appended without dedup").
        await db.agentSessionEntry.createMany({
          data: entries.map((entry) => ({
            workspaceId,
            projectKey: key.projectKey,
            sessionId: key.sessionId,
            subpath: key.subpath ?? null,
            entryUuid: entry.uuid ?? null,
            entry: entry as unknown as Prisma.InputJsonValue,
          })),
          skipDuplicates: true,
        });

        await upsertSummary(key, entries);
      } catch (error) {
        // Fase 9 (PLANO_OBSERVABILIDADE_OPERACAO.md's own Fase 3 row:
        // "alerta em mirror_error se a gravação falhar"), implemented
        // here rather than in Fase 3 because Fase 3 never actually
        // wired it — disclosed at the time as a real gap, not silently
        // left out. A failed append() means the SDK's own transcript
        // mirror for this session is now incomplete — the SDK doc's own
        // words are that losing the SessionStore write loses the
        // transcript with it, so this is the one failure mode in this
        // whole container worth a dedicated, greppable/alertable tag
        // rather than a generic catch. This is a plain Bun app, not a
        // Next.js one — @repo/observability's error.ts/log.ts pull in
        // @sentry/nextjs and @logtail/next, so importing them here
        // would add an unverified Next.js-coupled dependency to a
        // container that isn't Next.js, for no real gain until this
        // container has its own OTEL/Sentry wiring (a separate, still-
        // open gap). console.error to the container's own stdout/stderr
        // is the one real, dependency-free alerting substrate this app
        // actually has right now — a real log line an operator's log
        // pipeline can already alert on. Re-thrown after logging: the
        // SDK still needs to know the append failed, not just see it
        // logged.
        console.error("mirror_error", {
          workspaceId,
          projectKey: key.projectKey,
          sessionId: key.sessionId,
          subpath: key.subpath ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    load: async (key) => {
      const rows = await db.agentSessionEntry.findMany({
        where: {
          workspaceId,
          projectKey: key.projectKey,
          sessionId: key.sessionId,
          subpath: key.subpath ?? null,
        },
        orderBy: { id: "asc" },
      });
      if (rows.length === 0) {
        return null;
      }
      return rows.map((row) => row.entry as SessionStoreEntry);
    },

    listSessions: async (projectKey) => {
      const rows = await db.agentSessionSummary.findMany({
        where: { workspaceId, projectKey },
        select: { sessionId: true, mtime: true },
      });
      return rows.map((row) => ({
        sessionId: row.sessionId,
        mtime: Number(row.mtime),
      }));
    },

    listSessionSummaries: async (projectKey) => {
      const rows = await db.agentSessionSummary.findMany({
        where: { workspaceId, projectKey },
      });
      return rows.map((row) => ({
        sessionId: row.sessionId,
        mtime: Number(row.mtime),
        data: row.data as Record<string, unknown>,
      }));
    },

    delete: async (key) => {
      // Deleting the main key must cascade to every subpath for the
      // session too (explicit rule in the SDK doc) — omitting the
      // `subpath` filter here means "every row for this session",
      // main transcript and every subagent transcript alike.
      await db.$transaction([
        db.agentSessionEntry.deleteMany({
          where: {
            workspaceId,
            projectKey: key.projectKey,
            sessionId: key.sessionId,
          },
        }),
        db.agentSessionSummary.deleteMany({
          where: {
            workspaceId,
            projectKey: key.projectKey,
            sessionId: key.sessionId,
          },
        }),
      ]);
    },

    listSubkeys: async (key) => {
      const rows = await db.agentSessionEntry.findMany({
        where: {
          workspaceId,
          projectKey: key.projectKey,
          sessionId: key.sessionId,
          subpath: { not: null },
        },
        distinct: ["subpath"],
        select: { subpath: true },
      });
      return rows
        .map((row) => row.subpath)
        .filter((subpath): subpath is string => subpath !== null);
    },
  };
};
