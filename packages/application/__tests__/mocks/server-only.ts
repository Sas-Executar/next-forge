// Vitest alias target for `server-only` (see vitest.config.mts). Same
// rationale as packages/database/__tests__/mocks/server-only.ts: it
// throws unconditionally outside Next.js's bundler, and next-action.ts
// transitively imports it via @repo/database.
export {};
