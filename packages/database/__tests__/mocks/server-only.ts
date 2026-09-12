// Vitest alias target for the `server-only` package (see vitest.config.mts).
// `server-only` throws unconditionally unless imported through Next.js's
// bundler (it checks a webpack-injected condition that plain Vitest/Node
// never sets) — this repo's Next.js apps never hit that failure because
// their build actually goes through webpack, but a bare `vitest run`
// against packages/database does not. No-op stub, tests only.
export {};
