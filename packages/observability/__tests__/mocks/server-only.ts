// Vitest alias target for `server-only` (see vitest.config.mts). The
// DB-backed modules (business-events.ts, ai-cost.ts, metrics.ts)
// transitively import it via @repo/database.
export {};
