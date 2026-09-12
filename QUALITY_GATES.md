# Quality Gates

M17-T04 — real, enforced values for the 4 gates the Blueprint names but
leaves entirely `TBD` (`docs/12-testing-evals/QUALITY_GATES.md`,
Blueprint, read-only — TEST-009, `status: draft`, every cell in its
table literally reads "TBD"). Code-owned, same discipline as every other
Blueprint stub this project has filled in (M16's permission matrix,
M17-T03's eval datasets): these are this repo's own real thresholds,
not a transcription of something the Blueprint specifies.

| Gate | Required signal | Threshold | Blocking | Evidence |
|---|---|---|---|---|
| typecheck | `bun run typecheck` (`tsc --noEmit` across every package via Turborepo) | 0 errors, every package | Yes | `.github/workflows/ci.yml`'s `typecheck` job |
| tests | `bun run test` (vitest across every package) | 0 failures. DB-/credential-gated suites (`describe.skipIf(!process.env.DATABASE_URL)` and the same pattern for other secrets) must *skip*, not fail, when the secret is absent — a suite that fails closed instead of skipping is itself a bug | Yes | `.github/workflows/ci.yml`'s `test` job |
| agent evals | `packages/agent-runtime/__tests__/evals.test.ts` (part of the `test` task above, not a separate CI job — see M17-T03) | 100% pass on every case in `evals/{datasets,adversarial,regression}/*.jsonl`, every severity. No partial-credit/severity-weighted tolerance exists yet — the dataset is small (18 cases as of M17) and every case is meaningful; a severity-weighted gate is real future work once the dataset is large enough to need one, not built speculatively here | Yes | Same `test` job; case IDs and `grader`/`severity` fields are in the eval-case output on failure |
| security | `.github/workflows/security.yml` (M16-T05): TruffleHog OSS secrets scan | 0 verified secrets found | Yes | `security.yml`'s `secrets-scan` job |
| security (dependencies) | `.github/workflows/security.yml`: `bun audit` | Informational only for now — this repo's dependency tree carries a real, disclosed pre-existing baseline (306 advisories, 9 critical, overwhelmingly transitive dev-tooling) that predates this gate; M16-T05's own comment explains why blocking on it today would fail every PR with nothing to fix in scope | No (`continue-on-error: true`) | `security.yml`'s `dependency-audit` job |

## What's deliberately not a gate yet

- **Build.** `apps/web` cannot render any route without a real
  `BASEHUB_TOKEN` (confirmed by actually starting it — see
  `apps/web/e2e/README.md`); `apps/app` needs a live Postgres + Clerk
  keys. A real build/deploy gate belongs to M19 (CD Web/Mobile), once
  those credentials exist somewhere this repo's CI can reach them.
- **E2E (Playwright).** `apps/app/playwright.config.ts` and
  `apps/web/playwright.config.ts` (M17-T01) are real and ready to run,
  but need the same credentials the build gate does — not wired into
  `ci.yml` for the same reason.
- **Severity-weighted eval scoring, calibration sets, false-positive
  policy.** TEST-008 (`GRADERS.md`) asks for these; this repo's two real
  graders (`schema`, `forbidden_absent`, `packages/agent-runtime/src/evals/graders.ts`)
  are binary pass/fail by design — a calibration set needs a large
  enough case corpus to calibrate against, which 18 hand-written cases
  isn't.

## Where each gate actually runs

- `typecheck`, `tests` (incl. agent evals): `.github/workflows/ci.yml`
  (M17-T04, this milestone).
- `security`: `.github/workflows/security.yml` (M16-T05).
- `lint` runs in `ci.yml` too — not named as one of the Blueprint's 4
  gates, but a real, enforced prerequisite (`bunx ultracite check .`,
  0 errors) all the same.
