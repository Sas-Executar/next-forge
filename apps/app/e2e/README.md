# `apps/app` E2E suite (M17-T01)

Real Playwright specs against a real running `apps/app` dev server and a
real Postgres database — no mocks, no stubbed Clerk session.

## What each spec needs

| Spec | Needs |
|---|---|
| `sign-in.spec.ts` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` only |
| `core-execution-slice.spec.ts` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_CLERK_USER_EMAIL` (a real user in that Clerk instance, already a MEMBER of some workspace), `DATABASE_URL` (a real, migrated Postgres — the RLS migrations must be applied) |

`E2E_CLERK_USER_EMAIL` is **not** created by this repo. Seed one by hand
(Clerk dashboard, or `@clerk/backend`'s `createUser`) against whichever
Clerk instance `CLERK_SECRET_KEY` points at, then invite/add that user
to a workspace's `Membership` so `requireWorkspace()`/`requireRole()`
resolve.

## Running

```bash
cd apps/app && bunx playwright test
# or, from the repo root, for every app's suite at once:
bun run e2e
```

`apps/app/playwright.config.ts` starts this app's own `bun run dev` for
you via `webServer` — no separate server process to manage by hand.

## Why this suite could not be run in this milestone's own sandbox

Confirmed by actually trying, not assumed: this sandbox has no
`DATABASE_URL` (packages/database's Neon adapter fails at import time
without one — the same constraint disclosed in every PR body on this
branch since M02) and no live Clerk credentials. `sign-in.spec.ts` alone
would need at minimum a real publishable key to even mount Clerk's
`<SignIn/>` component. These specs are real and ready to run the moment
real credentials exist — CI, staging, or a developer's own `.env.local`
— they were simply never executed here.
