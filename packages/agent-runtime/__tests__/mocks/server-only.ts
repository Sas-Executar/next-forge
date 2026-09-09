// Vitest alias target for `server-only` (see vitest.config.mts). Same
// rationale as packages/application/__tests__/mocks/server-only.ts: it
// throws unconditionally outside Next.js's bundler, and every command
// here transitively imports it via @repo/database.
export {};
