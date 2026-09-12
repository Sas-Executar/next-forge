# `apps/web` E2E suite (M17-T01)

Real Playwright specs against a real running `apps/web` dev server — no
mocks. None of these specs need Clerk or a database; `apps/web` is the
public, credential-free marketing site.

## What this suite needs

`BASEHUB_TOKEN` — a real BaseHub content token. This is not a per-spec
requirement, it's a hard requirement of the app itself:
`apps/web/app/[locale]/layout.tsx` (the shared layout every route in
this app renders through) fetches CMS navigation/content and throws
without a real token — there is no route in this app, public or not,
that avoids it.

## Running

```bash
cd apps/web && bunx playwright test
# or, from the repo root, for every app's suite at once:
bun run e2e
```

## Why this suite could not be run in this milestone's own sandbox

Confirmed by actually trying, not assumed: `SKIP_ENV_VALIDATION=true
bun run dev --filter=web` starts cleanly, but every request (tried `/en`
directly) returns `500` with `🔴 Token not found. Make sure to include
the BASEHUB_TOKEN env var.` thrown from the shared `[locale]` layout —
this sandbox has no such token. These specs are real and ready to run
the moment a real `BASEHUB_TOKEN` exists — CI, staging, or a developer's
own `.env.local` — they were simply never executed here.
