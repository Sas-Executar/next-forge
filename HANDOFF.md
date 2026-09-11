# Session Handoff — EXECUTAR on next-forge

**Written**: 2026-09-11, by the Claude Code session that did M00–M21 +
ADR-DS-001 (`session_01MxVVTzzCbACMDJdCjBU5KN`), for a **new session/agent
continuing this work** after a context-limit handoff. Read this file
first — it's the fastest path back to full context, faster than
re-deriving state from the diff or the PR history.

## 1. Where things stand, right now

- **Repo**: `Sas-Executar/next-forge`. **Branch**: `claude/trusting-pasteur-w4jzf1`.
  **PR**: [#1](https://github.com/Sas-Executar/next-forge/pull/1) — draft,
  27 commits, head `e1a803afadfc6797ff6ab4384bdfdacf3e301c93`.
- **Code**: complete and green. `bun run typecheck` 37/37, `bun run test`
  all passing, `bunx ultracite check .` 0 errors (659 files). GitHub
  Actions CI (Lint/Typecheck/Test/Secrets scan/Dependency audit/token-drift)
  all ✅ on the current head.
- **PR #1's only red checks right now**: the 3 Vercel preview deployments
  (`executar-nf-app`/`executar-nf-web`/`executar-nf-api`) — all fail on
  **missing provider env vars** in the newly-created Vercel projects
  (`Invalid environment variables` for app/api, `BASEHUB_TOKEN` missing for
  web). This is confirmed from the actual build logs, not assumed — see
  the standing-down comment already posted on the PR
  (https://github.com/Sas-Executar/next-forge/pull/1#issuecomment-5625464728).
  **This is not a code defect** — it's real infra work that only a human
  can finish (no Vercel MCP tool sets env vars). `executar-nf-storybook`
  deploys clean, confirming the build pipeline itself is fine.
- **This session is subscribed to PR #1's GitHub activity**
  (`subscribe_pr_activity`). If you're a fresh session picking this up,
  either resume this same conversation (context and subscription both
  carry over) or, if starting genuinely fresh, call
  `subscribe_pr_activity` again for `Sas-Executar/next-forge#1` — events
  arrive as `<wake reason="external-event">` envelopes.

## 2. What's actually done (milestones)

- **M00–M20**: full EXECUTAR product build on next-forge — see PR #1's
  own description and `PRODUCT_AUDIT.md` for the milestone-by-milestone
  table. Not re-summarized here; that table is the source of truth and
  doesn't need to be duplicated.
- **M21 (launch readiness)**: apps/mobile's 5 placeholder tabs replaced
  with real screens (7 new `apps/api` adapter routes + 5 mobile client
  modules); real Neon production DB provisioned and migrated; 4 real
  Vercel projects created and linked; real Stripe test-mode
  products/prices/webhook created. `LAUNCH_RUNBOOK.md` is the
  authoritative record of exactly what's 🤖 done vs. 🧑 still manual.
- **ADR-DS-001 (design system convergence)**: new `@repo/design-tokens`
  package is now the single source of truth for every design token
  (primitives, semantic layer, typography, spacing, radius, shadows,
  light/dark themes). `packages/design-system` consumes it instead of
  owning tokens. IBM Plex Sans/Mono replaces Geist. Mobile's color
  constants source real tokens instead of Expo defaults. A real
  (disclosed, not Blueprint-sourced) dark theme exists. Canonical
  4/8/12/16px radius is wired end-to-end. Every arbitrary hex in
  `apps/mobile/app/**` was eliminated. A CI gate
  (`packages/design-tokens/scripts/check-drift.ts`) fails the build if
  `css/variables.css` and `src/*.ts` disagree — verified against an
  injected mismatch, not just that it passes clean. A Chromatic visual
  regression job exists in `ci.yml`, gated on a not-yet-provisioned
  `CHROMATIC_PROJECT_TOKEN` secret. See `PRODUCT_AUDIT.md`'s ADR-DS-001
  row for the full detail.

## 3. Governance conventions established this session — follow these

These aren't optional style choices; the whole PR's credibility rests on
them being followed consistently. Breaking any of these on a continuation
would be a real regression in trust, not just style.

1. **No real secret ever gets committed to git.** This repo's own
   `security.yml` (TruffleHog) scans every push for exactly this. Any
   real secret (`DATABASE_URL`, `STRIPE_WEBHOOK_SECRET`, a future one)
   goes to the user directly (chat text or `SendUserFile`), or is
   documented by **retrieval path only** (e.g. "Neon console → project →
   Connection Details") in a committed doc, marked 🔑.
2. **🤖 / 🧑 marking convention** (used throughout `LAUNCH_RUNBOOK.md`):
   🤖 = actually done this session via a live Neon/Vercel/Stripe MCP tool
   call, verified against that tool's own output — never claimed without
   having actually called the tool and read the result. 🧑 = genuinely
   manual, because no connector/tool exists for it — always name the
   *exact* retrieval path (which dashboard, which menu), never just "get
   this somehow."
3. **Disclose every gap, never silently paper over one.** Precedents
   already in the codebase, follow the same pattern for any new one:
   - `packages/design-tokens/src/primitives.ts`'s azure-8 value is
     interpolated (the Blueprint source has it as a verbatim duplicate of
     azure-9) — disclosed in a code comment, not silently "fixed" to
     something invented.
   - `packages/design-tokens/src/themes/dark.ts`'s entire dark palette is
     a disclosed, new (non-Blueprint) design decision, flagged as a
     starting point for real design/QA, not presented as verbatim source
     data.
   - `apps/api/app/cron/routines/route.ts`'s `POLL_TOLERANCE_MS` change
     (daily instead of 15-minute polling, because this Vercel team is on
     the Hobby plan) is a real, disclosed product degradation with the
     exact revert documented in the same comment — not a silent
     workaround.
   - When something is out of scope (e.g. mobile free-form AI chat, RN
     test harness), say so explicitly in the PR body / `PRODUCT_AUDIT.md`
     — don't let it look finished by omission.
4. **PR ownership**: this PR was opened by this session, so per the
   system's own standing rules, red CI/deploy status on it is always this
   session's to act on — a fix, or (as done here) one standing-down
   comment naming exactly what's failing, why it isn't a code defect, and
   what unblocks it. Never let a wake on this PR pass with nothing done.
   A failure already commented on this way needs no second comment
   **unless it's a genuinely new, distinct failure** — always check the
   actual build/log output before assuming "same as before."
5. **Verification is not optional before claiming done.** Every change
   this session made was checked against `bun run typecheck`,
   `bun run test`, and `bunx ultracite check .` before being committed —
   and the token-drift script was sanity-checked by actually injecting a
   mismatch and confirming it fails, not just trusting the happy path.
   Continue that standard: don't report something as working without
   having actually run it.

## 4. Exact next steps, in order

This is `LAUNCH_RUNBOOK.md`'s own checklist, restated here as the
literal next actions — see that file for full detail on each:

1. **Unblock the 3 failing Vercel deployments** (the PR's only red
   check): the user needs to paste the env vars from the delivered
   `vercel-env-upload/{app,web,api}.env` files into each Vercel project's
   Settings → Environment Variables. `apps/web` is the most urgent —
   it hard-crashes on every route without `BASEHUB_TOKEN`. **This
   session cannot do this step itself** — no Vercel MCP tool sets env
   vars. Once done, a re-deploy (new commit, or a manual redeploy in the
   Vercel dashboard) should go green; if it doesn't, read the new build
   log before assuming it's the same known cause.
2. **Clerk production setup** (`LAUNCH_RUNBOOK.md` §4) — entirely manual,
   dashboard-only (Clerk's connector here is docs/snippets-only, no
   provisioning API). Once the user has the 3 real keys, they go into
   step 1's env var set.
3. **Domain purchase** (§3) — Vercel's connector *can* buy a domain for
   real (`check_domain_availability_and_price` → `get_purchase_quote` →
   `buy_domain` with `confirm:true`), but needs the user to name the
   domain and approve the quoted price first — real money, ask before
   acting.
4. **Remaining providers** (§6/§7: OpenAI, BaseHub content, Resend,
   Knock, BetterStack, Arcjet, Svix, Liveblocks, PostHog, WhatsApp,
   Gmail, Outlook) — no connector for any of these; manual signup, exact
   var names already in `INFRASTRUCTURE.md`.
5. **Mobile launch prep** (§8) — `eas init`, Apple/Google developer
   accounts — only relevant once a real mobile release is imminent.
6. **Once PR #1's 3 Vercel checks are green**: undraft the PR, do a
   final `bun run typecheck && bun run test && bunx ultracite check .`
   pass, merge into `main` (matches Track D in the original M21 plan —
   see the plan file referenced in this session's own history if it's
   still available, otherwise this handoff supersedes it).
7. **Post-merge**: `LAUNCH_RUNBOOK.md` §10's smoke sequence (Playwright
   E2E against the real deployed URLs, live RLS spot-check, LGPD
   export/delete round-trip, Stripe test-mode checkout dry run) —
   don't skip this once real infra is live; it's the last check that
   the provisioned infra actually works end-to-end, not just that it
   exists.

## 5. Where the real secrets are

- **Not in this repo** (by design — see §3.1 above). The real
  `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET`, and the ready-to-upload
  `vercel-env-upload/{README,app,web,api,mobile}.env` files were
  delivered directly to the user (chat + `SendUserFile`) and are
  gitignored locally — a fresh clone of this repo will **not** have
  them on disk.
- **If they're needed again and the user doesn't have them**: both are
  still real, live resources — re-derive them rather than inventing new
  ones. `DATABASE_URL` via Neon MCP `get_connection_string` on project
  `executar-production` (`snowy-dawn-65785764`), role `executar_owner`,
  database `executar`. `STRIPE_WEBHOOK_SECRET` — the webhook endpoint
  `we_1UEB5OQ7o5IHoh4HmGA3hBwM` already exists in Stripe (test mode,
  account `acct_1UEAHqQ7o5IHoh4H`); its signing secret is only shown
  once at creation, so if truly lost, delete and recreate that one
  endpoint via `stripe_api_write` rather than trying to retrieve the old
  secret.
- **Never regenerate a secret that still works** just because you can't
  find the old value in this conversation — check with the user first;
  rotating a live credential is a real, disruptive action.

## 6. Key documents (read in this order for a fuller picture)

1. This file (`HANDOFF.md`) — continuity/governance, start here.
2. `LAUNCH_RUNBOOK.md` — the exact infra checklist, 🤖/🧑 marked.
3. `PRODUCT_AUDIT.md` — milestone-by-milestone what's real vs. what
   still needs live credentials to verify.
4. `INFRASTRUCTURE.md` — the full env var inventory per app.
5. `PR #1`'s own description — the original M00–M21 changelog.
