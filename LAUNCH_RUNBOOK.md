# Launch Runbook (M21)

What's already real (done via the connected Neon/Vercel/Stripe MCP tools this
session — verified by their own output, not assumed) vs. what's still a
manual step because no connector exists for it. Every 🔑 marks a real secret
value that exists but is **not** written into this file or committed to git —
secrets belong in GitHub/Vercel's own secret stores, never in repo history
(this repo's own `security.yml` scans for exactly that). Get each 🔑 value
either from the session that generated it, or regenerate/retrieve it from
the provider's own dashboard — both are named below.

## 1. 🤖 Neon production database — DONE

- Org: `sas_executar@outlook.com` (`org-winter-mountain-31273448`)
- Project: `executar-production` (`snowy-dawn-65785764`), region `aws-us-east-2`, Postgres 18
- Database: `executar`, default branch `main` (`br-royal-wildflower-ayvud3cl`)
- All 8 existing Prisma migrations applied for real (30 tables incl. RLS
  policies on every workspace-scoped table) — verified via `get_database_tables`.
  `_prisma_migrations` populated with the real checksum of each migration file
  so a future `prisma migrate deploy` (once `DATABASE_URL` is wired into CI)
  sees these as already-applied and no-ops cleanly, rather than re-running
  or conflicting.
- 🔑 **`DATABASE_URL`** — get it from Neon console → project
  `executar-production` → Connection Details (role `executar_owner`, database
  `executar`), or ask this session for the value it already generated.

🧑 `NEON_API_KEY` (a personal/org API key, for `preview-db.yml`'s per-PR
branches) — mint one in Neon console → Account Settings → API Keys; no
tool mints this. Once you have it:
- GitHub repo → Settings → Secrets and variables → Actions → **Secrets**:
  add `NEON_API_KEY`.
- Same page → **Variables**: add `NEON_PROJECT_ID` = `snowy-dawn-65785764`.

## 2. 🤖 Vercel projects — DONE (env vars still 🧑 manual)

Team: `Sas_Executar` (`team_fJe21quDM0egDSTPE0CFwNnm`), 4 real projects,
each linked to `Sas-Executar/next-forge` with the matching `rootDirectory`:

| App | Project | Project ID | URL |
|---|---|---|---|
| `apps/app` | `executar-nf-app` | `prj_MkAbPkEyQRJboeX6xTKiLFoviPdl` | executar-nf-app-sas-executar1.vercel.app |
| `apps/web` | `executar-nf-web` | `prj_h4tfuhTnIiedTObU16xvBAEWkBWI` | executar-nf-web-sas-executar1.vercel.app |
| `apps/api` | `executar-nf-api` | `prj_eT3E4NGlkjWnDhv1XmGCnxi0932M` | executar-nf-api-sas-executar1.vercel.app |
| `apps/storybook` | `executar-nf-storybook` | `prj_ZaRfOZdchptCOpjViZj4RubN4I4C` | executar-nf-storybook-sas-executar1.vercel.app |

Each fired an initial preview deploy against `main` (pre-M21 content, no env
vars yet) — expected to be broken/incomplete right now; that's diagnostic,
not a bug to chase. Two real, fixed findings from that first deploy:
- `apps/storybook`'s `vercel.json` was missing an explicit `framework`/
  `buildCommand`/`outputDirectory` — Vercel auto-detected "Next.js" from
  a vestigial `next.config.ts`/`next` dependency (unused; the app's real
  build is `storybook build` → `storybook-static/`) and looked for a
  `.next` directory that was never produced. Fixed by pinning those 3
  fields explicitly.
- `apps/api/vercel.json`'s routines cron was every 15 minutes — this
  team's real Vercel plan is Hobby, which rejects any cron more frequent
  than daily. Changed to once/day (`0 6 * * *`) with
  `apps/api/app/cron/routines/route.ts`'s `POLL_TOLERANCE_MS` updated to
  match — a real, disclosed degradation (routines get checked once a
  day, not every 15 minutes) until this Vercel project is upgraded to
  Pro, not a design change. That file's own comment documents the exact
  revert.

It becomes fully real once:

🧑 **Populate env vars** — Vercel dashboard → each project → Settings →
Environment Variables (no MCP tool sets these). Per `INFRASTRUCTURE.md`'s
matrix:

| Var | `app` | `web` | `api` | Value source |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | — | ✅ | 🔑 §1 above |
| `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_WEBHOOK_SECRET` | ✅ | — | ✅ (webhook secret: `api` only) | §4 below |
| `STRIPE_SECRET_KEY` | ✅ | — | ✅ | Stripe dashboard → Developers → API keys (test mode; this session only got price/webhook write access, not the secret key itself) |
| `STRIPE_WEBHOOK_SECRET` | — | — | ✅ | 🔑 §5 below (`we_1UEB5OQ7o5IHoh4HmGA3hBwM`'s signing secret) |
| `OPENAI_API_KEY` | ✅ | — | — | platform.openai.com |
| `BASEHUB_TOKEN` | — | ✅ | — | BaseHub dashboard |
| `INTEGRATIONS_ENCRYPTION_KEY` / `WHATSAPP_*` / `GMAIL_*` / `OUTLOOK_*` | ✅ | — | ✅ | §7 below |
| `RESEND_FROM` / `RESEND_TOKEN` | ✅ | ✅ | ✅ | §6 below |
| Full remaining inventory | — | — | — | `INFRASTRUCTURE.md`'s own table — unchanged |

🧑 **Custom domains** — once §3 buys one, attach it in each project's
Settings → Domains.

## 3. 🧑 Domain + DNS — waiting on you

Vercel's connector *can* buy a domain for real
(`check_domain_availability_and_price` → `get_purchase_quote` →
`buy_domain` with `confirm:true`) — genuinely automatable, but it's real
money and a naming decision only you can make. Tell this session the domain
you want and approve the quoted price, and it runs the purchase + DNS +
custom-domain attachment on the 3 public Vercel projects (`app`/`web`/`api`)
in one pass.

## 4. 🧑 Clerk — no provisioning API, dashboard only

Clerk's connector here is docs/SDK-snippets only (`clerk_sdk_snippet`,
`list_clerk_sdk_snippets`) — no project/instance/webhook management
endpoint exists to call.

1. Clerk dashboard → switch from Development to a **Production** instance.
2. Configure the org webhook: Webhooks → Add Endpoint →
   `https://executar-nf-api-sas-executar1.vercel.app/webhooks/auth` (or the
   real custom domain once §3 lands), events: `organization.*`,
   `organizationMembership.*` (matches what
   `apps/api/app/webhooks/auth/route.ts` already handles).
3. Copy the production `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   / the webhook's signing secret (`CLERK_WEBHOOK_SECRET`) into §2's table.
4. `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (mobile) — same publishable key, set
   in EAS env (§8).

## 5. 🤖 Stripe test-mode products/prices/webhook — DONE

Account: `Área restrita de Executar` (`acct_1UEAHqQ7o5IHoh4H`), **test mode**.
Created via `stripe_api_write`, using the exact `executar_<plan>_<interval>`
`lookup_key` scheme `packages/billing/src/products.ts`'s `syncStripeProducts()`
already expects — `checkout.ts`'s lookup-by-key logic works against these
unmodified, no code change needed:

| Plan | Interval | Lookup key | Price ID | Amount (BRL) |
|---|---|---|---|---|
| Solo | month | `executar_solo_month` | `price_1UEB4pQ7o5IHoh4HQ0WPJe7z` | R$49,90 |
| Solo | year | `executar_solo_year` | `price_1UEB4xQ7o5IHoh4HGUWNKQUg` | R$499,00 |
| Pro | month | `executar_pro_month` | `price_1UEB50Q7o5IHoh4HopwJNNkO` | R$89,90 |
| Pro | year | `executar_pro_year` | `price_1UEB53Q7o5IHoh4HyqmXtvPL` | R$919,00 |
| Business | month | `executar_business_month` | `price_1UEB55Q7o5IHoh4HxgYXQGDT` | R$499,00 |
| Business | year | `executar_business_year` | `price_1UEB58Q7o5IHoh4H2oY5GCdz` | R$5.390,00 |

Webhook endpoint `we_1UEB5OQ7o5IHoh4HmGA3hBwM` → the real `apps/api` URL's
`/webhooks/payments`, subscribed to exactly the 7 event types
`apps/api/app/webhooks/payments/route.ts` handles (`checkout.session.completed`,
`subscription_schedule.canceled`, `customer.subscription.{created,updated,deleted}`,
`invoice.paid`, `invoice.payment_failed`).

🔑 The webhook's signing secret (`STRIPE_WEBHOOK_SECRET`) and a test-mode
`STRIPE_SECRET_KEY` (Stripe dashboard → Developers → API keys — this
session's Stripe access can write products/prices/webhooks but was never
handed the account's actual secret key) both go in §2's table.

🧑 **Livemode switch** — real business/bank verification with Stripe
(their own KYC, not API-automatable). Once you confirm the account is
activated, this session re-runs the same product + webhook creation against
`livemode: true` (a deliberate, separate step — never silent, per the
connector's own "warn before switching test/live" rule) and hands you the
new live `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` to swap in.

## 6. 🧑 OpenAI / BaseHub / Resend / Knock / BetterStack / Arcjet / Svix / Liveblocks / Upstash / Vercel Blob / PostHog

No connector for any of these — real signup + key generation per provider,
exact var names in `INFRASTRUCTURE.md`'s existing inventory table (unchanged
here). **BaseHub also needs real Privacy Policy/Terms content authored** —
the CMS holds no content yet; this is a legal/content task, not code.

## 7. 🧑 WhatsApp / Gmail / Outlook

No connector. Real per-provider app registration:
- **WhatsApp**: Meta Cloud API app + a real phone number →
  `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_APP_SECRET` / `WHATSAPP_API_VERSION`.
- **Gmail**: Google Cloud project + OAuth client + Pub/Sub topic →
  `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REDIRECT_URI` /
  `GOOGLE_PUBSUB_AUDIENCE`.
- **Outlook**: Azure AD app registration → `OUTLOOK_CLIENT_ID` /
  `OUTLOOK_CLIENT_SECRET` / `OUTLOOK_REDIRECT_URI`.

Each provider's webhook/redirect URL should point at the real, deployed
`apps/api`/`apps/app` URLs from §2 (or the custom domain from §3).
`INTEGRATIONS_ENCRYPTION_KEY` — generate locally with `openssl rand -base64 32`,
a distinct value per environment (never reuse preview/production).

## 8. 🧑 Expo/EAS + Apple/Google

No connector. `eas init` (writes a real `extra.eas.projectId` into
`apps/mobile/app.json`, currently empty) → `EXPO_TOKEN` as a GitHub secret →
set `vars.EAS_PROJECT_CONFIGURED=true`. Then: Apple Developer Program
enrollment + App Store Connect app record; Google Play Console developer
account + app record; populate `apps/mobile/eas.json`'s empty
`submit.production` profile with the real credentials both stores issue.

## 9. Consolidated GitHub secrets/variables checklist

| Name | Kind | Status |
|---|---|---|
| `DATABASE_URL` | secret | 🔑 real value, §1 |
| `NEON_API_KEY` | secret | 🧑 mint in Neon console |
| `NEON_PROJECT_ID` | variable | ✅ `snowy-dawn-65785764` |
| `VERCEL_TOKEN` | secret | 🧑 Vercel dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | variable | ✅ `team_fJe21quDM0egDSTPE0CFwNnm` |
| `VERCEL_PROJECT_ID_APP` | secret | ✅ `prj_MkAbPkEyQRJboeX6xTKiLFoviPdl` |
| `VERCEL_PROJECT_ID_WEB` | secret | ✅ `prj_h4tfuhTnIiedTObU16xvBAEWkBWI` |
| `VERCEL_PROJECT_ID_API` | secret | ✅ `prj_eT3E4NGlkjWnDhv1XmGCnxi0932M` |
| `EXPO_TOKEN` | secret | 🧑 §8 |

(`VERCEL_PROJECT_ID_STORYBOOK` isn't read by `deploy-web.yml`'s matrix today —
`apps/storybook` deploys via Vercel's own git integration, not that workflow.)

## 10. Post-launch smoke sequence

Once §2's env vars land and a real deploy succeeds:

1. `bunx playwright test` in `apps/app/e2e` and `apps/web/e2e` (M17, already
   written) against the real deployed URLs — set `E2E_CLERK_USER_EMAIL` and
   the real base URL first.
2. Live RLS spot-check: `bun run test` with the real `DATABASE_URL` exported
   locally — `packages/database/__tests__/rls.test.ts`'s
   `describe.skipIf(!process.env.DATABASE_URL)` suite (89 tests) runs for
   real against this database instead of skipping.
3. Live LGPD export/delete round-trip: `apps/app/app/actions/privacy/{export,delete}.ts`
   against a real workspace.
4. A Stripe **test-mode** checkout dry run (§5's real prices) end-to-end
   before ever touching live keys.
