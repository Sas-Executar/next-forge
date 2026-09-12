/**
 * @repo/scanner/server — the DB-backed half of this package
 * (SymbolRegistry + CommandDispatcher), deliberately kept out of the
 * root `@repo/scanner` barrel (index.ts). Both registry.ts and
 * dispatch.ts `import "server-only"` and depend on `@repo/database`
 * (Node-only Postgres driver, `import "server-only"` itself) — bundling
 * either into apps/mobile's React Native app would break at build or
 * runtime. This mirrors packages/auth's existing server.ts/client.ts
 * split for exactly the same reason.
 *
 * apps/mobile only ever imports the root `@repo/scanner` barrel (pure
 * matching/latch/preprocessing math); a Next.js server (a future
 * `/scanner/dispatch` API route on apps/api, this milestone's disclosed
 * scope boundary — see this package's own README-equivalent comment in
 * index.ts) is the only place `@repo/scanner/server` should be
 * imported from.
 */

export { dispatch, undo } from "./src/dispatch";
export {
  decodeEmbeddings,
  EmptyEmbeddingListError,
  encodeEmbeddings,
  InconsistentEmbeddingDimensionError,
} from "./src/embedding-codec";
export {
  listEnabledSymbols,
  registerSymbol,
  setSymbolEnabled,
  toRegisteredSymbol,
} from "./src/registry";
