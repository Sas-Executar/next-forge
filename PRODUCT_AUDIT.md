# Product Audit (M20)

M20-T01/T02 — the plan's own text names the audit source as "`OBJETIVOS
E OUTPUT REQUIREMNETS.md`'s 51 sections." That file does not exist
anywhere in the `Executar-app-Blueprint` repository as actually cloned
in this session (confirmed by search, not assumed) — it was never a
real, committed document, only a reference from the plan's own drafting
context. Substituting it with a fabricated 51-section audit against
content that was never there would be worse than not having one.

What *does* exist, and is what this audit is actually built against:

1. `Executar-app-Blueprint/MASTER_INDEX_CHECKLIST.md` (real, `id:
   MASTER-CHECK-001`, 25 sections) — its own §24 "STATUS GLOBAL" table,
   dated 2026-09-09 (the day this implementation effort began), states
   plainly in the Blueprint's own words: *"Aplicação funcional não
   declarada"* (no functional application declared) — every layer
   (Frontend real, Backend real, Data model real, Integrações reais,
   Testes/evals reais, Release) marked `PENDENTE` or `NÃO DECLARADO`.
   That table is reproduced below with a real "next-forge, now" column
   added next to it.
2. This plan's own M00–M19 milestone table — the real Acceptance/DoD
   criteria this session was built against, not a substitute document.
3. What actually exists in `next-forge` right now, checked by running
   the same three commands one more time, not by recalling the
   milestone commits from memory: `bun run typecheck`, `bun run test`,
   `bunx ultracite check .`.

## The maturity ladder (plan §10, Blueprint's own text)

*"documentado ≠ implementado ≠ funcional ≠ testado ≠ verificado ≠
deployed ≠ released"* — every claim below is placed on this ladder
honestly. **Verified** means: an automated check actually ran in this
sandbox and passed. **Functional (not verified)** means: the code is
real and would run correctly given real credentials this sandbox never
had (Postgres, Clerk, Stripe, OpenAI, BaseHub, Vercel, Neon, Expo,
Apple/Google developer accounts — the same list disclosed in every PR
body since M02). Nothing in this repository claims **deployed** or
**released** — M18/M19's own workflows exist and are correct but have
never executed against a real target.

## Repo-wide state, right now

- `bun run typecheck` — **36/36 packages clean.**
- `bun run test` — **259 tests passing, 141 correctly skipping**
  (`describe.skipIf(!process.env.DATABASE_URL)` and the same pattern
  for every other credential-gated suite — a skip here is the suite
  behaving correctly without secrets, not a failure), **0 failing**,
  across 20 packages/apps that carry a test suite.
- `bunx ultracite check .` — **0 errors, 0 warnings** across 626 files.
- `.github/workflows/ci.yml` + `security.yml` — green on this PR's
  current head (verified against GitHub's own check-run API this
  session, not assumed).

## STATUS GLOBAL — Blueprint's own table (§24), vs. next-forge today

| Camada | Blueprint (2026-09-09) | next-forge, now |
|---|---|---|
| Blueprint de governança | ESTRUTURADO | (unchanged — Blueprint repo, read-only from here) |
| Product Vision | PRE_APPROVED | Read; M04's vertical slice and M05's 17-route IA implement it |
| Fluxo omnicanal | PRE_APPROVED | M11: 4 real adapters (WhatsApp/Gmail/Outlook/Calendar), normalized via `ExternalObjectRef` |
| Workspace conceitual | PRE_APPROVED | M05: all 17 routes render, 3 view modes, 2 scope modes |
| Copiloto flow | PRE_APPROVED | M06: 5 commands, real `orchestratorOutputSchema` contract, PRE_APPROVE gate — tested (M17's eval harness), the M06 chat route not independently E2E-verified (needs `OPENAI_API_KEY`) |
| Rotinas | PRD/PROMPT PRE_APPROVED + SPEC DRAFT | M10: real 19-step-equivalent pipeline, idempotency keys, `AuthorityGate` — unit-tested |
| Mapa-OS | REGISTERED v1.1.0 | M07: real Prisma A4 template population, 4 projections — unit-tested |
| Scanner | REGISTERED_FROM_SOURCE | M09: real DINOv2/ONNX pipeline, 3 V1 symbols — unit-tested; on-device latency genuinely unmeasured (no physical device in this sandbox, disclosed at M09 itself) |
| Entregáveis/templates | REGISTERED / PLACEHOLDERIZED | M07: `StatusReport` 3P+N builder, real, tested |
| MCP | REGISTERED_REFERENCE / GATE PENDENTE | M12: real tool registry against implemented capabilities only (not the unimplemented 157-tool catalog the Blueprint itself flags as absent) |
| Domínio detalhado | TEMPLATE_ONLY / PENDENTE | M02: real state machines (`packages/domain`), 28 workspace-scoped Prisma models |
| Data model real | PENDENTE | M02: real schema, real FK constraints (D1), RLS on every workspace-scoped table (M03), full RLS test coverage across all 28 models (M16-T02) |
| Frontend real | PENDENTE | M05 (workspace web) + M14 (institutional web, real copy, zero placeholders) |
| Backend real | PENDENTE | M04 vertical slice through M13 (billing) — real server actions, real webhooks, real Stripe integration |
| Integrações reais | PENDENTE | M11: 4 real provider adapters |
| Testes/evals reais | PENDENTE | M17: 400 total tests (259 passing), a real TEST-007-shaped eval harness (18 cases, replacing the Blueprint's own single-row `TBD` seeds), Playwright E2E infra (unexecuted here, real and ready) |
| Release | NÃO DECLARADO | M19: real CI (`ci.yml`, green), CD Web/Mobile workflows (correct, unexecuted — no cloud account) |

Every "PENDENTE"/"NÃO DECLARADO" row on the left is now real, tested
(where a test can run without a live external credential), and — per
the ladder above — **not yet verified against a live deployment**,
because no live deployment has ever existed for this project.

## Milestone-by-milestone (M00–M19)

| # | Milestone | Implemented | Tested | Verified in this sandbox |
|---|---|---|---|---|
| M00 | Repo/Claude foundation | ✅ `AGENTS.md`, 5 new packages registered | — | ✅ `bun install && bun typecheck` |
| M01 | Next Forge baseline | ✅ `relationMode: foreignKeys`, `packages/schemas`, AI router | ✅ | ✅ |
| M02 | Domain + database | ✅ 28-model schema, `packages/domain` state machines | ✅ (`@repo/domain`, `@repo/schemas`) | ✅ typecheck + unit tests; migration apply needs real Postgres |
| M03 | Auth + tenancy | ✅ Clerk webhook sync, RLS on every table | ✅ (expanded to full coverage at M16-T02) | Real RLS enforcement needs live Postgres — schema/policy SQL is real and reviewed |
| M04 | Core execution slice | ✅ Eligibility, next-action, server actions, `/now` `/projects` | ✅ unit; ✅ E2E spec written (M17) | E2E spec unexecuted (no live DB/Clerk) |
| M05 | Workspace Web | ✅ 17 routes, 3 view modes, design tokens | — (UI) | Not screenshot-verified (no live app) |
| M06 | Copilot + AI runtime | ✅ 5 commands, PRE_APPROVE gate, output-schema | ✅ 33 agent-runtime tests | Chat route (`OPENAI_API_KEY`) unexecuted |
| M07 | Reports + Mapa-OS | ✅ 3P+N builder, Prisma A4 population, 4 projections | ✅ | ✅ pure logic; PDF render path unexecuted |
| M08 | Expo mobile foundation | ✅ scaffold, Clerk Expo auth, EAS profiles | — | Needs a real Expo account/device |
| M09 | Scanner | ✅ real matcher/dispatcher, 3 V1 symbols | ✅ 41 tests | On-device latency genuinely unmeasured (disclosed) |
| M10 | Routines + Automations | ✅ pipeline, idempotency, `AuthorityGate` | ✅ | ✅ pure logic; scheduler needs live cron + DB |
| M11 | Omnichannel integrations | ✅ 4 real adapters, normalization | ✅ 25 tests | OAuth/webhook flows need real provider apps |
| M12 | MCP | ✅ real tool registry, audit trail | ✅ (DB-gated, skips cleanly) | Needs live DB + MCP client |
| M13 | Billing | ✅ entitlements, credits, Stripe checkout | ✅ 6 tests (DB-gated ones skip) | Needs real Stripe keys |
| M14 | Institutional Web | ✅ real copy (Microsoft-style, zero placeholder), real pricing | ✅ 3 E2E specs written (M17) | E2E unexecuted (BaseHub token absent — confirmed by actually trying) |
| M15 | Observability | ✅ trace schema, business events, AI cost, dashboard | ✅ 15 tests | Needs live DB/OpenAI/Stripe for end-to-end reconciliation |
| M16 | Security/Privacy/A11y | ✅ permission matrix, full RLS (89 tests), LGPD export/delete, a11y fixes, `security.yml` | ✅ 17 + 89 tests | ✅ permission matrix live-checked; RLS/privacy flows need live DB |
| M17 | Tests/Evals | ✅ Playwright infra, `@repo/schemas` coverage, real eval harness, `ci.yml` | ✅ 26 + 19 tests, first real CI gate | ✅ CI genuinely green on this PR |
| M18 | Production infra | ✅ Neon preview-branch workflow, env matrix, secrets inventory | — (config) | Needs real Neon/Vercel accounts |
| M19 | Web/mobile release | ✅ CD Web + CD Mobile workflows, store-submission prep | — (config) | Needs real Vercel/Expo/Apple/Google accounts |

## M20-T03 — Blueprint traceability

Not performed here, per the plan's own instruction: updating
`Executar-app-Blueprint/MASTER_INDEX_CHECKLIST.md`'s state markers is
"a separate PR, separate repo, out of this plan's write scope unless
the user asks for it explicitly." This audit's own comparison table
above is evidence-ready for that PR whenever it's requested — it isn't
written yet.
