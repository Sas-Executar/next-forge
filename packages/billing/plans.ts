/**
 * Pure, DB-independent billing entry point (M14-T03) — mirrors the
 * index.ts (full barrel, DB-backed) / server.ts split pattern already
 * established in this repo (packages/auth's server.ts/client.ts,
 * packages/scanner's index.ts/server.ts, this same package's own
 * entitlements.ts/workspace-entitlements.ts split from M13).
 *
 * apps/web (the public marketing site) needs real plan/price/
 * entitlement data for `/pricing` but must never pull in `@repo/
 * database`'s `DATABASE_URL` requirement or `@repo/payments`'s
 * `STRIPE_SECRET_KEY` requirement just to render a static pricing
 * table — importing the full `@repo/billing` barrel (`index.ts`) would
 * do exactly that, since it re-exports `checkout.ts`/`credits.ts`/
 * `workspace-entitlements.ts`, all of which transitively load env-
 * validated modules. This file only re-exports the two genuinely pure
 * source modules.
 */

export {
  entitlementsForPlan,
  hasEntitlement,
  PLAN_ENTITLEMENTS,
  type PlanEntitlements,
} from "./src/entitlements";
export {
  BUSINESS_ADDITIONAL_SEAT_PRICE_CENTAVOS,
  PLAN_DEFINITIONS,
  type PlanDefinition,
  SELF_SERVE_PLANS,
} from "./src/plans";
