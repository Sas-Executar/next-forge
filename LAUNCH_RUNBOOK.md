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

## 2. 🤖 Vercel projects — RECRIADOS (repo foi renomeado; env vars ainda 🧑 manual)

**2026-09-12 — reconciliação:** o PR #1 foi mergeado em `main`. Nesse meio-tempo,
outra sessão/processo renomeou o repositório (`Sas-Executar/next-forge` →
`Sas-Executar/01-Executar-Echo`, o GitHub redireciona a URL antiga) e os 4
projetos Vercel originais abaixo **deixaram de existir** (o time passou a
listar 3 projetos completamente diferentes, ligados a outros repositórios).
O GitHub App do Vercel também precisou ser reinstalado manualmente
(`https://github.com/apps/vercel`) antes de recriar os projetos — a
integração anterior não sobreviveu à renomeação. Os 4 projetos foram
recriados com os mesmos nomes/`rootDirectory`, novos IDs:

Team: `Sas_Executar` (`team_fJe21quDM0egDSTPE0CFwNnm`), 4 projetos reais,
cada um ligado a `Sas-Executar/01-Executar-Echo` (ainda respondendo por
`Sas-Executar/next-forge`) com o `rootDirectory` correspondente:

| App | Project | Project ID |
|---|---|---|
| `apps/app` | `executar-nf-app` | `prj_tjzeAZAoitSeuYf0RNEhmyakMiMo` |
| `apps/web` | `executar-nf-web` | `prj_pa8ihwg7ReAncAAhZMBHdKTLMZr1` |
| `apps/api` | `executar-nf-api` | `prj_Ui40tk9orjhk5wq5tG90F5z65kiD` |
| `apps/storybook` | `executar-nf-storybook` | `prj_AgAOTg4tmiNRlgHViJnqy6SAtKSn` |

O usuário conectou, pelo próprio dashboard da Vercel, uma integração de
Storage/Database aos projetos — ainda não verificado nesta sessão se ela
injeta um `DATABASE_URL` equivalente ao do Neon `executar-production`
(seção 1) ou aponta para um banco novo/vazio. Isso será confirmado pelo
primeiro deploy real (commit que gerou este parágrafo) + smoke test da
seção 10; se apontar para um banco vazio, as 8 migrations precisam rodar
contra ele antes de qualquer teste de RLS fazer sentido.

Antigos IDs (não usar mais, projetos não existem): `prj_MkAbPkEyQRJboeX6xTKiLFoviPdl`
(app), `prj_h4tfuhTnIiedTObU16xvBAEWkBWI` (web), `prj_eT3E4NGlkjWnDhv1XmGCnxi0932M`
(api), `prj_ZaRfOZdchptCOpjViZj4RubN4I4C` (storybook).

Histórico da primeira rodada de deploys (projetos antigos, achados que
seguem válidos e já corrigidos no código, `apps/*/vercel.json`):
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

Estado em 2026-09-12 (segunda reconciliação, feita pelo usuário direto no
dashboard, confirmada nesta sessão via `get_database_tables`):

| Var | `app` | `web` | `api` | Status |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | — | ✅ | 🤖 sobrescrito pelo usuário via Edit (não Add — a variável era `Sensitive`, write-only) com o valor confirmado de `executar-production` (Neon), 30 tabelas reais, migrations aplicadas |
| `OPENAI_API_KEY` | ✅ | — | — | 🤖 chave real da OpenAI configurada |
| `STRIPE_SECRET_KEY` | ✅ | — | ✅ | 🤖 configurada (test-mode, `sk_test_51UEAHq...`) |
| `STRIPE_WEBHOOK_SECRET` | — | — | 🧑 | ainda pendente — §5 abaixo |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_WEB_URL` | ✅ | ✅ | ✅ | 🤖 confirmado pelo usuário nos 3 projetos (`packages/next-config/keys.ts` exige `z.url()` sem `.optional()` — bloqueava `next build` com "Invalid environment variables" antes disso) |
| `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_WEBHOOK_SECRET` | 🧑 | — | 🧑 | ainda pendente — §4 abaixo (todas opcionais no schema, não bloqueiam build) |
| `INTEGRATIONS_ENCRYPTION_KEY` / `WHATSAPP_*` / `GMAIL_*` / `OUTLOOK_*` | 🧑 | — | 🧑 | §7 abaixo |
| `RESEND_FROM` / `RESEND_TOKEN` | 🧑 | 🧑 | 🧑 | §6 abaixo |
| Inventário completo restante | — | — | — | `INFRASTRUCTURE.md` — inalterado |

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

## 6. 🧑 OpenAI / Resend / Knock / BetterStack / Arcjet / Svix / Liveblocks / Upstash / Vercel Blob / PostHog

No connector for any of these — real signup + key generation per provider,
exact var names in `INFRASTRUCTURE.md`'s existing inventory table (unchanged
here).

**BaseHub — 🤖 fechado, sem conta externa.** O blog e as páginas legais do
`apps/web` deixaram de depender do BaseHub: o conteúdo agora é MDX local em
`packages/cms/content/{blog,legal}`, editado direto no repo via PR normal.
`BASEHUB_TOKEN` não existe mais em nenhum `.env.example`. **Os textos de
Termos/Privacidade em `packages/cms/content/legal/` são rascunhos-placeholder
— precisam de revisão jurídica real antes do lançamento** (CONTENT_GAP,
não ACCOUNT_GAP).

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
| `CHROMATIC_PROJECT_TOKEN` | secret | 🧑 ADR-DS-001 §9 — no connector; create a free project at chromatic.com linked to this repo, paste its token. Gates `ci.yml`'s `visual-regression` job (skipped, not failed, while unset). |

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
