/**
 * M21 (LAUNCH_RUNBOOK.md's Stripe step) — real CLI entrypoint for the
 * already-existing `syncStripeProducts()` (`src/products.ts`, M13-T01),
 * which until now was only callable programmatically. Run as:
 *
 *   STRIPE_SECRET_KEY=sk_... bun run sync:stripe
 *
 * `src/products.ts` starts with `import "server-only"` (a Next.js
 * RSC-bundler guard, not a Node/Bun-runtime one) — that package's own
 * `exports` map only resolves to its no-op stub under the
 * `react-server` condition, so this script's root `sync:stripe` command
 * passes `--conditions=react-server` to `bun run` for exactly that
 * reason (confirmed via `bun run --help`, not guessed).
 */
import { syncStripeProducts } from "../src/products";

const main = async () => {
  const results = await syncStripeProducts();
  for (const result of results) {
    console.log(
      `${result.plan} (${result.interval}): ${result.lookupKey} -> price ${result.priceId} (product ${result.productId})`
    );
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
