# Infrastructure

M18 (env wiring) + M19 (release/deploy) — Vercel/Neon/EAS environment
wiring and CD, real code/config where a real config file can express it
(`vercel.json`, `eas.json`, `.github/workflows/{preview-db,deploy-web,
deploy-mobile}.yml`), documented where the actual linkage is inherently
a dashboard/account action (`vercel link`, creating a real Neon/EAS/App
Store Connect/Google Play project) no file in this repo can perform or
verify. Every "not done here" item below is a real external-account
step, not a shortcut around code that could have been written instead.

## Release workflows (M19)

- **`ci.yml`** (M17-T04) — lint/typecheck/test on every PR. M19-T01's
  own target; built ahead of schedule because M17's quality gates
  needed it. Already green on this branch's own PR.
- **`security.yml`** (M16-T05) — secrets + dependency scanning.
- **`preview-db.yml`** (M18-T02) — a Neon branch per PR.
- **`deploy-web.yml`** (M19-T02) — migration gate → deploy
  `apps/{app,web,api}` (Vercel's own CLI flow: `vercel pull` →
  `vercel build` → `vercel deploy --prebuilt`) → an HTTP health check
  per app. Gated on a real `vars.VERCEL_ORG_ID`; rollback is `vercel
  rollback <url> --token=...` — a real, single command, documented in
  the health-check step's own error message rather than wired to
  auto-fire, since a real trigger needs a real deployment URL from a
  real run to test against.
- **`deploy-mobile.yml`** (M19-T03) — EAS Update (OTA) on every push to
  `main`, EAS Build on a `mobile-v*` tag, EAS Submit on manual dispatch
  only (store submission is a deliberate, reviewed action, never
  auto-triggered by a build). Gated on `vars.EAS_PROJECT_CONFIGURED`.

None of these four release/deploy workflows have run for real in this
sandbox — each needs a real cloud account this project has never had
credentials for (Vercel, Neon, Expo/EAS). Every command in them was
verified against each tool's own current documentation/CLI reference
before being written, not assumed (see each milestone's own commit for
the exact sources).

## Store submission (M19-T04)

`apps/mobile/app.json` already carries real, non-placeholder identity
(`bundleIdentifier: "app.executar.mobile"`, matching Android `package`)
and `eas.json`'s `appVersionSource: "remote"` means EAS manages build
numbers remotely — both landed in M08, nothing to add here. `eas.json`'s
`submit.production` profile is deliberately left empty: `eas submit`
prompts interactively for whatever Apple ID/App Store Connect app
ID/Apple Team ID/Android service-account-key path isn't configured —
fabricating placeholder values for real developer-account identifiers
would be actively wrong, not a shortcut. Populating them is a real
Apple/Google developer account action, done once a real account exists.

## Vercel projects

Four apps already carry a real `vercel.json` (`apps/{app,web,api,storybook}`
— `apps/docs`/`apps/email`/`apps/studio`/`apps/mobile` aren't Vercel
deployments): `bunVersion: "1.x"`, a `scripts/skip-ci.js` ignore-command
(Next Forge's own path-based build-skip convention), and `apps/api` adds
its two real Vercel Cron entries (`/cron/keep-alive`, `/cron/routines` —
M10-T03).

**M21 update**: the Vercel connector's own project-creation API is now
available in this environment, so linking is done — 4 real projects exist
under team `Sas_Executar` (`team_fJe21quDM0egDSTPE0CFwNnm`), each linked to
`Sas-Executar/next-forge` with the matching `rootDirectory`:
`executar-nf-app` (`prj_MkAbPkEyQRJboeX6xTKiLFoviPdl`), `executar-nf-web`
(`prj_h4tfuhTnIiedTObU16xvBAEWkBWI`), `executar-nf-api`
(`prj_eT3E4NGlkjWnDhv1XmGCnxi0932M`), `executar-nf-storybook`
(`prj_ZaRfOZdchptCOpjViZj4RubN4I4C`). What remains a real account action —
populating each project's environment variables — has no Vercel MCP tool
either; see `LAUNCH_RUNBOOK.md` §2 for the exact per-project list.

### Environment matrix

Every var below is a real key some `keys.ts` in this repo already
validates (`packages/*/keys.ts`) — this table says which Vercel
environment each belongs in, not a new inventory. "Preview" means every
non-production deploy (PR previews); "Development" means a
contributor's own `.env.local`.

| Variable class | Development | Preview | Production |
|---|---|---|---|
| `DATABASE_URL` | Local Neon branch or a personal scratch DB | The PR's own Neon branch (`preview-db.yml`, M18-T02) | Neon's `main` branch |
| `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk's own "Development instance" keys | Same Development instance (Clerk doesn't branch per-PR) | Clerk's Production instance keys — a distinct key pair, not the same value promoted |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe test-mode keys | Same test-mode keys | Stripe live-mode keys |
| `OPENAI_API_KEY` | A real key with a low spend cap | Same as Development, or a separate capped preview key | A real key with production-scale budget alerts |
| `BASEHUB_TOKEN` | BaseHub's own preview/dev token | Same | BaseHub's production token |
| `INTEGRATIONS_ENCRYPTION_KEY` | A locally-generated throwaway (`openssl rand -base64 32`) | A distinct preview key — never the production key, so a leaked preview environment can't decrypt production `IntegrationConnection` rows | The real production key, rotated per the org's own policy (not defined in this repo) |
| Everything else (`RESEND_*`, `KNOCK_*`, `WHATSAPP_*`, `GMAIL_*`, `OUTLOOK_*`, `BETTERSTACK_*`, `ARCJET_KEY`, `SVIX_TOKEN`, `LIVEBLOCKS_SECRET`, `UPSTASH_REDIS_REST_*`, `FLAGS_SECRET`, `BLOB_READ_WRITE_TOKEN`) | Real test/sandbox credentials where the provider offers them, unset otherwise (every one of these is `.optional()` in its `keys.ts` — the app degrades honestly, per each package's own comment, never crashes) | Same as Development | Real production credentials |

None of these values are set anywhere in this repo (by design — they're
secrets) or in this sandbox (by necessity — none exist here). The table
says *which environment gets which kind of value*, not the values
themselves.

## Neon (M18-T02)

`.github/workflows/preview-db.yml` — real, in the repo, using Neon's own
`create-branch-action`/`delete-branch-action`, gated on a
`vars.NEON_PROJECT_ID` repository variable so it safely no-ops (not
errors) until a real Neon project exists to point it at. See that file's
own header for exactly what it does and doesn't wire up.

**M21 update**: a real Neon production project now exists —
`executar-production` (`snowy-dawn-65785764`), org
`sas_executar@outlook.com` (`org-winter-mountain-31273448`), created via
the Neon MCP connector's own provisioning API. All 8 existing Prisma
migrations were applied for real (30 tables, RLS policies included,
`_prisma_migrations` populated with real checksums so a future `prisma
migrate deploy` sees them as already-applied). `vars.NEON_PROJECT_ID` in
GitHub and each Vercel project's `DATABASE_URL` still need to be set
manually — see `LAUNCH_RUNBOOK.md` §1/§9.

## EAS / Expo (M18-T03)

`apps/mobile/eas.json` already has three real build profiles
(`development`/`preview`/`production`, M08-T05) plus `preview`/`production`
update channels. `apps/mobile/env.ts` centralizes the app's
`EXPO_PUBLIC_*` vars (Expo inlines these into the client bundle at build
time — a different mechanism from `@t3-oss/env-nextjs`, see that file's
own comment for why). Real linkage this repo's code can't perform:
`eas init` (associates `eas.json` with a real Expo/EAS project id) and
populating each channel's `EXPO_PUBLIC_*` values via `eas env` or the
Expo dashboard — both need a real Expo account.

## Secrets inventory (M18-T04)

Every required/optional server + client var across every `keys.ts` in
this repo, and which app(s) actually need it at runtime — including
vars an app's own `env.ts` doesn't `extend` directly but a package it
calls does (e.g. `apps/app` never imports `@repo/payments/keys` or
`@repo/integrations/keys` into its own `createEnv`, but `@repo/billing`
and the Gmail/Outlook OAuth routes it hosts call those packages' own
`keys()` at runtime — so `apps/app/.env.example` lists them anyway, the
same reasoning that already applied to `STRIPE_*` there before this
milestone).

| Package (`keys.ts`) | Vars | Needed by |
|---|---|---|
| `@repo/database` | `DATABASE_URL` | `app`, `api`, `web` (all three `env.ts`) |
| `@repo/auth` | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_*` | `app`, `api` |
| `@repo/ai` | `OPENAI_API_KEY` | `app` (Copilot, `/api/chat`) |
| `@repo/payments` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `app` (checkout actions via `@repo/billing`), `api` (webhook route) |
| `@repo/integrations` | `INTEGRATIONS_ENCRYPTION_KEY`, `WHATSAPP_*`, `GMAIL_*`, `GOOGLE_PUBSUB_AUDIENCE`, `OUTLOOK_*` | `app` (OAuth connect/callback routes), `api` (inbound webhooks) |
| `@repo/cms` | `BASEHUB_TOKEN` | `web` only (confirmed the hard way this milestone — M17's `apps/web/e2e/README.md` — every route crashes without it) |
| `@repo/email` | `RESEND_FROM`, `RESEND_TOKEN` | `app`, `api`, `web` |
| `@repo/notifications` | `KNOCK_*` | `app` |
| `@repo/collaboration` | `LIVEBLOCKS_SECRET` | `app` |
| `@repo/observability` | `BETTERSTACK_*`, `SENTRY_*` | `app`, `api`, `web` |
| `@repo/security` | `ARCJET_KEY` | `app`, `web` |
| `@repo/webhooks` | `SVIX_TOKEN` | `app` |
| `@repo/feature-flags` | `FLAGS_SECRET` | `app`, `web` |
| `@repo/rate-limit` | `UPSTASH_REDIS_REST_*` | not currently wired into any app's `env.ts` — present for whichever package adopts it |
| `@repo/storage` | `BLOB_READ_WRITE_TOKEN` | not currently wired into any app's `env.ts` — present for whichever package adopts it |
| `@repo/analytics` | `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_POSTHOG_*` | `app`, `api`, `web` |
| `@repo/next-config` | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DOCS_URL` | `app`, `api`, `web` |
| `apps/api/env.ts` (app-local) | `CRON_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | `api` only |
| `apps/mobile/env.ts` (app-local) | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DINOV2_MODEL_URL`, `EXPO_PUBLIC_DINOV2_MODEL_SHA256` | `mobile` only |
| `apps/app/e2e` (M17-T01, test-only) | `E2E_CLERK_USER_EMAIL` | Playwright, not the app itself |

Every `apps/*/.env.example` is kept in sync with this table — `apps/app/.env.example` gained the `@repo/integrations` vars in this milestone (a real, previously-undocumented gap this audit found, not a hypothetical one).
