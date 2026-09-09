# AGENTS.md

## Repository roles

```
Sas-Executar/Executar-app-Blueprint      Sas-Executar/next-forge
READ / REQUIREMENTS / SOT           →    PLAN / IMPLEMENT / TEST / DEPLOY
```

`Executar-app-Blueprint` is the canonical requirements source — PRDs,
ADRs, specs, contracts, decisions. It is **read-only** from here: consult
it before implementing, cite the IDs you read (`PRD-*`, `ADR-*`,
`SPEC-*`, `REQ-*`) in commits/PRs, never edit it as part of product work
in this repo. Documentation updates in the Blueprint happen only as a
trailing traceability step after code here proves something, in a
separate PR to that repo, not as a substitute for shipping code here.

This repo (`next-forge`) is where the EXECUTAR product is actually built:
architecture, code, schema, migrations, tests, CI/CD, deploy. See
`/root/.claude/plans/root-claude-uploads-5b3d88f9-9bbc-5d5c-wise-nautilus.md`
for the current milestone plan (M00–M20) if present in this session, or
ask for it to be re-shared — this file is a pointer, not a copy, so it
doesn't drift out of sync with the plan's own edits.

## Baseline stack (ADR-STACK-001)

Next Forge's own defaults are the baseline and are adopted automatically
unless a canonical EXECUTAR decision says otherwise: **Neon Postgres +
Prisma** (`packages/database`), **Clerk** (`packages/auth`), **Stripe**
(`packages/payments`), **Resend** (`packages/email`), **Vercel Blob**
(`packages/storage`), **PostHog** (`packages/analytics`), **Sentry +
BetterStack** (`packages/observability`), **Arcjet + Upstash**
(`packages/security`, `packages/rate-limit`), **Svix**
(`packages/webhooks`), **Vercel AI SDK** (`packages/ai`), **shadcn/ui +
Tailwind** (`packages/design-system`), on **Bun + Turborepo + Biome**.

**Do not introduce Supabase, or bind canonical application state to
Google Drive or any document store**, without an ADR in the Blueprint
that explicitly supersedes this section. Neither has ever been adopted —
Supabase appears in the Blueprint only as unratified scaffolding (now
removed) and as an optional next-forge migration target it documents but
doesn't use; a Google-Drive-as-state binding appears only in one skill
reference and contradicts this repo's actual database.

Known deviations from the raw defaults, already decided (see the plan for
full rationale):
- `packages/database/prisma/schema.prisma`: `relationMode` is
  `"foreignKeys"`, not the template's original `"prisma"` — the product
  requires real FK/constraint enforcement.
- `packages/ai`: model choice is routed through a 3-tier router
  (`router.ts`), not the template's single hardcoded `gpt-4o-mini` — the
  corpus prohibits scattered per-feature model calls.
- `packages/design-system`: consumes the EXECUTAR canonical design
  tokens (`UI-005` in the Blueprint) as an adapter layer, not a second
  visual authority — the stock shadcn palette is a placeholder until that
  lands.
- No mobile surface exists yet in this template; `apps/mobile` (Expo) is
  a planned addition, not a swap of an existing default.

## Precedence when something isn't decided yet

`EXECUTAR canonical decision (Blueprint ADR/SPEC/PRD)` → `this file` →
`Next Forge default` → provider's official docs → current best practice.
A gap with no Next Forge default and no canonical EXECUTAR decision is
resolved by direct implementation with a documented rationale (commit
message / PR description), not by stopping to ask, unless it's genuinely
structural and hard to reverse.

## Maturity ladder

`documentado ≠ implementado ≠ funcional ≠ testado ≠ verificado ≠
deployed ≠ released`. Don't describe code as more finished than its
actual verification evidence supports — say what was actually run, not
what should pass.

## Git / PR workflow

Base branch has moved or the working branch conflicts with it → merge the
base into the working branch and continue; never stop to ask before doing
this, and never leave a PR sitting on a stale or conflicted head.
