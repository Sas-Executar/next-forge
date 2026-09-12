# WORKFLOW 01.01 — Launch Runbook 1:1

Status: IN_PROGRESS
Owner: SAS · EXECUTAR
Source of truth: `LAUNCH_RUNBOOK.md` + live provider verification + repository evidence
Rule: documented/provisioned is not equivalent to deployed/verified/released.

## Objective

Execute the existing M21 launch runbook 1:1, preserving its provider setup, while reconciling every documented claim against the current live state. A step is DONE only when its acceptance test has passed with evidence.

## Status vocabulary

- `DONE_VERIFIED` — live state tested and evidence collected.
- `IMPLEMENTED_UNVERIFIED` — code/config exists but no live end-to-end proof yet.
- `EXTERNAL_DEPENDENCY` — requires provider account, credential, KYC, store registration or user-controlled secret.
- `BLOCKED` — prerequisite prevents execution.
- `DRIFT` — repository/runbook claim conflicts with current provider state.
- `NOT_STARTED` — no execution evidence yet.

## W1.1.1 — Reconcile repository and release branch

Status: `IMPLEMENTED_UNVERIFIED`

Evidence:
- Launch implementation is on `claude/trusting-pasteur-w4jzf1` / PR #1, not canonically released from `main`.
- Separate `chatgpt/scroll-task-prototype` contains the newer approved Scroll Task UI direction and is not yet unified with the launch branch.

Action:
1. Treat `claude/trusting-pasteur-w4jzf1` as the implementation source for this workflow until explicit merge.
2. Do not mark production release DONE from branch-local tests.
3. Reconcile the approved Scroll Task UI before final release gate.

DONE when:
- approved implementation/UI is unified;
- CI gates pass on the release candidate;
- release branch is explicitly merged/canonized.

## W1.1.2 — Reconcile Vercel projects

Status: `DRIFT` (4 code root causes found and fixed and locally verified; live Preview redeploy on PR #12 surfaced a 5th, separate, environment-config gap — see below)

2026-09-12, PR #12's Preview deploy on all 3 projects (`app`/`web`/`api`)
failed identically with a missing required env var
(`DATABASE_URL` for `app`/`api`, `NEXT_PUBLIC_APP_URL` for `web`) — the
exact same vars `LAUNCH_RUNBOOK.md` §2 confirms are set. This session's
Vercel MCP access has no per-environment env-var read/write tool, but the
pattern (works on `main`'s Production builds per §2's own history, fails
identically on every Preview build regardless of which of these 3 fixes
landed) points to those vars being scoped to Production only, not
Preview, on all 3 projects. Recorded here rather than assumed fixed —
needs the dashboard (Settings → Environment Variables → per-var
environment checkboxes) to confirm/fix, then a fresh Preview push to
verify. Commented the specifics on PR #12 as each failure landed.

2026-09-12 audit, this session:
- All 4 documented projects resolve live under `team_fJe21quDM0egDSTPE0CFwNnm`
  by their exact `LAUNCH_RUNBOOK.md` §2 IDs, each correctly linked to
  `Sas-Executar/01-Executar-Echo` — the DRIFT this section previously
  described (projects not resolving) is stale; that was the first
  reconciliation, already superseded by §2's "segunda reconciliação".
- `latestDeployment` on `main` (commit `1e14dbe`): `app`/`web`/`api` =
  `ERROR`, `storybook` = `READY`. Pulled each failing deployment's real
  build logs (`get_deployment_build_logs`) instead of assuming — 4 distinct
  root causes, all now fixed in this branch:
  1. **`app`** — three Server Action modules (`create-task.ts`,
     `complete-action.ts`, `privacy/delete.ts`) exported an `Error`
     subclass alongside their `"use server"` action — Next 16 requires
     every export of a `"use server"` file to be an async function, so
     the whole module (and everything importing it) failed to compile.
     Fixed by moving each error class into a sibling `*-errors.ts` file.
  2. **`api`** — `packages/notifications/index.ts` called `new Knock({
     apiKey })` at module load with an intentionally-`.optional()` env
     var; Next's build-time page-data collection evaluates the module
     graph, so an unset `KNOCK_SECRET_API_KEY` crashed the build before
     any request was ever handled. Fixed by constructing the client
     lazily on first real use.
  3. **`api`+`web` (shared root cause)** — `packages/mapa-os/src/populate.ts`
     and `packages/cms/lib/posts.ts` both read a file at module load using
     `path.join(import.meta.dirname, ...)`; `import.meta.dirname` isn't
     populated for workspace packages inside Next's Turbopack server
     bundle, so both crashed identically (`"paths[0]" property must be of
     type string, got undefined`) — `mapa-os` at build-time module eval
     (blocking `api`), `cms` when the `web` sitemap route actually calls
     `getPostsMeta()` during static generation. Fixed both by deriving the
     directory from `import.meta.url` (`fileURLToPath`) instead, which
     Turbopack does rewrite correctly, plus lazy reads.
  4. **`api`** — `apps/api/proxy.ts` did a bare `export { authMiddleware as
     default } from "@repo/auth/proxy"`; Next 16's proxy/middleware
     convention detection statically looks for a function value on the
     file's own default export and doesn't resolve a re-exported binding
     through another module, so it rejected the build with "must export a
     function". `apps/web` and `apps/app`'s `proxy.ts` both already call
     `authMiddleware(...)` directly — `apps/api` didn't, for no functional
     reason. Fixed to match.
- Verified all 4 root causes with real local builds (`bun --bun next
  build`, real required env vars, no `SKIP_ENV_VALIDATION` skip except
  where a var is genuinely irrelevant to the path under test): `api` and
  `app` build clean; `web` builds clean once given real `DATABASE_URL` +
  `NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_WEB_URL` (all three already documented
  in `LAUNCH_RUNBOOK.md` §2 as required). Full monorepo `turbo typecheck`
  (38/38), `ultracite check` on every touched file, and `turbo test` for
  every touched package pass clean.
- Also found: `LAUNCH_RUNBOOK.md` §2's table claims `NEXT_PUBLIC_APP_URL`/
  `NEXT_PUBLIC_WEB_URL` are ✅ confirmed on Vercel's `web` project — the
  real build log shows `web` failed with `Invalid input: expected string,
  received undefined` on `NEXT_PUBLIC_APP_URL`. Recorded as DRIFT in that
  file's own table rather than silently "fixed" here — setting Vercel
  project env vars has no MCP tool in this session and needs the
  dashboard.

Remaining before this gate can close:
1. 🧑 Confirm/re-set `NEXT_PUBLIC_APP_URL` on Vercel's `web` project
   (dashboard — no connector for writing project env vars in this
   session).
2. Merge this branch's PR to `main` (or redeploy `main` once merged) and
   pull fresh build logs — the 4 fixes above are proven by local build,
   not yet by a live Vercel deployment on the corrected code.

Acceptance test (unchanged):
- all four projects resolve by ID/name — ✅ verified;
- app/web/api/storybook point to the intended repository/root directory — ✅ verified;
- deployment URLs respond successfully — pending real redeploy of this branch;
- GitHub Vercel statuses are green for the release candidate — pending.

## W1.1.3 — Environment and secret matrix

Status: `EXTERNAL_DEPENDENCY`

Required groups from the existing runbook/infrastructure inventory:
- Database: `DATABASE_URL`, Neon CI variables.
- Auth: Clerk production keys + webhook secret.
- AI: `OPENAI_API_KEY`.
- Billing: Stripe secret/webhook keys.
- CMS: `BASEHUB_TOKEN`.
- Integrations: encryption key, WhatsApp, Gmail, Outlook.
- Messaging/ops: Resend, Knock, BetterStack, Sentry, Arcjet, Svix, Liveblocks, Upstash, Blob, PostHog/GA.
- Mobile: Expo/EAS variables and model URL/SHA.

Rule:
- never commit secret values;
- verify presence and functional use, not just documentation.

DONE when:
- required variables exist in the correct environment/application;
- startup/build no longer falls back because of missing critical credentials;
- provider-specific smoke tests pass.

## W1.1.4 — CMS / Blog

Status: `IMPLEMENTED_UNVERIFIED`

Repository evidence:
- `packages/cms` integrates BaseHub;
- blog list/latest/post-by-slug queries exist;
- author/category/image/body/TOC/reading-time fields exist;
- legal page queries exist;
- web routes `/[locale]/blog` and `/[locale]/blog/[slug]` exist.

Gap:
- real `BASEHUB_TOKEN` and production content are not verified;
- Privacy Policy / Terms content still requires authoritative content.

Acceptance test:
- BaseHub returns real posts;
- blog index renders;
- slug page renders;
- empty/error fallback remains safe;
- legal routes contain approved production content.

## W1.1.5 — Agent runtime / SDK / Blueprint

Status: `IMPLEMENTED_UNVERIFIED`

Current architecture:
- custom EXECUTAR agent runtime built on Vercel AI SDK + OpenAI provider;
- deterministic commands: `/bomdia`, `/agora`, `/estado`, `/fechardia`;
- `/replanejamento` is propose/confirm and retains human gate;
- free-form chat uses model tool-calling when `OPENAI_API_KEY` is present;
- Blueprint contracts are encoded in runtime schemas/phases/output validation.

Agent phases:
`SYNC → UNDERSTAND → STRUCTURE → VISUALIZE → PRE_APPROVE → DECOMPOSE → EXECUTE → RECONCILE → REPORT → REPLAN`

Guard:
`REPLAN → VISUALIZE → PRE_APPROVE` before a new decomposition.

Skills status:
- Blueprint/SKILL files inform runtime behavior;
- relevant Copiloto skill behavior has been compiled into code/prompts/contracts;
- no generic dynamic skill loader/executor exists yet.

Acceptance test:
- deterministic commands run against a real workspace;
- free-form model call succeeds;
- model invokes an allowed tool;
- output validates against `orchestratorOutputSchema`;
- prohibited/human-gated writes remain blocked;
- `AIUsage`/telemetry evidence is recorded.

## W1.1.6 — Routines / automations

Status: `IMPLEMENTED_UNVERIFIED`

Implemented:
- RoutineConfig: scope, trigger, sources, execution policy, report, delivery, retry;
- scheduler discovers due ENABLED routines;
- run pipeline handles idempotency, source checks, reconciliation, authority, mutations, report, delivery and telemetry;
- workflow engine executes sequential steps, currently `create_task` and `notify`.

Known degradation:
- Vercel Hobby forces the routines cron to daily instead of the intended 15-minute polling.
- Routine timezone is stored but current scheduler effectively evaluates against server/UTC until timezone conversion is implemented.

Acceptance test:
- create/enable a routine;
- trigger due slot;
- verify deduplication;
- verify allowed mutation and blocked mutation behavior;
- verify report/delivery/audit/telemetry.

## W1.1.7 — Scanner execution automation

Status: `IMPLEMENTED_UNVERIFIED`

Implemented V1 command path:
`camera → DINOv2/ONNX → matcher → latch → symbol registry → dispatch`

Current executable commands:
- `OPEN_CHAT`;
- `OPEN_SELECTOR`;
- `COMPLETE_LATEST_OPEN_TASK`.

`COMPLETE_LATEST_OPEN_TASK` performs a real domain mutation:
- finds most recently updated task in DOING/VERIFY;
- authority check;
- transitions to DONE;
- creates `Evidence` with grade `A_OBSERVADO`;
- creates `AuditEvent`;
- creates `ScannerMutation`;
- emits business telemetry;
- supports undo.

Current composition gaps:
- Scanner → `RUN_ROUTINE`: not wired.
- Scanner → `RUN_WORKFLOW`: not wired.
- Scanner → `INVOKE_AGENT_SKILL`: not wired.

Device gap:
- ONNX `session.run()` is implemented but has not been proven against the actual production DINOv2 model artifact on a physical device.

Acceptance test:
- physical device recognizes all three canonical symbols;
- latch prevents duplicate dispatch;
- Done changes the correct task and creates evidence/audit/mutation;
- undo restores the exact previous state;
- latency and failure telemetry are captured.

## W1.1.8 — MCP

Status: `IMPLEMENTED_UNVERIFIED`

Implemented:
- authenticated Streamable HTTP MCP endpoint;
- project/task/action/evidence/state/routine/report/mapa tools;
- workspace/domain authority and audit path.

Architecture note:
- MCP and Agent Runtime are sibling adapters over the same domain/application layer; the agent does not currently use MCP as its internal mandatory tool bus.

Acceptance test:
- real MCP client initialize;
- list tools;
- authenticated `projects.list`;
- create project/task;
- persistence verified in DB;
- corresponding audit event verified.

## W1.1.9 — Mobile / Expo / stores

Status: `EXTERNAL_DEPENDENCY`

Implemented:
- Expo app config, iOS bundle and Android package identifiers;
- EAS build profiles;
- mobile feature screens/adapters.

Gap:
- `extra.eas.projectId` is empty;
- EAS project, Apple Developer/App Store Connect and Google Play records are not verified;
- submit production credentials/profile are not complete.

Acceptance test:
- EAS project linked;
- signed iOS and Android builds generated;
- builds installed on physical devices;
- auth/projects/Copilot/Mapa-OS/Scanner/push smoke tests pass;
- store submission pipeline is executable.

## W1.1.10 — Quality gates and post-launch verification

Status: `IMPLEMENTED_UNVERIFIED`

Existing blocking gates:
- typecheck: 0 errors;
- tests: 0 failures;
- agent evals: 100%;
- TruffleHog verified secrets: 0;
- lint/Ultracite: 0 errors.

Not yet canonical CI gates because credentials are required:
- production build;
- Playwright E2E;
- live database/RLS suites.

Release acceptance sequence:
1. build/deploy app, web, api, storybook;
2. Playwright app + web against deployed URLs;
3. real RLS suite with production-compatible database configuration;
4. LGPD export/delete round trip;
5. Stripe test-mode checkout/webhook round trip;
6. Clerk org/auth webhook;
7. CMS real-content render;
8. Agent model/tool call;
9. MCP client call;
10. Routine execution;
11. Scanner physical-device execution;
12. integration provider smoke tests as each credential becomes available.

## Working Backwards rule for all remaining steps

For every external dependency, the workflow must model the full chain:

`desired outcome → provider prerequisite → registration/form/KYC → credential/webhook → configuration → deploy → real action → evidence → DONE`

The workflow must not stop at instructions such as “configure Expo”, “create webhook” or “add API key” when an available connector/tool can perform the action directly. Human intervention is reserved for real authorization, payment/KYC, account ownership, secret disclosure or provider UI steps that cannot be automated from the connected toolset.

## Current next action

`W1.1.2 — Reconcile Vercel projects`'s 4 real build-breaking root causes
(§ above) are fixed and locally verified on this branch
(`claude/happy-albattani-o72glk`). Next: push this branch, let Vercel's
git integration redeploy `app`/`web`/`api`/`storybook` on it, and confirm
each's build status turns green for real — that's the acceptance test this
gate has always required, and it's still open until a live deployment
(not just a local build) proves it. `web`'s missing `NEXT_PUBLIC_APP_URL`
(new DRIFT recorded above) blocks a green `web` deploy until reset on the
Vercel dashboard.
