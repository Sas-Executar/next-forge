// Vitest alias target for `server-only` (see vitest.config.mts) — the
// real package throws when it detects a non-Node (jsdom) test
// environment, which this app's own vitest config uses. Every
// DB-backed/auth-backed module this app's new M21 routes import
// (`@repo/database`, `@repo/auth/server`) transitively imports it.
// Same fix packages/billing/vitest.config.mts already uses for the
// identical problem.
export {};
