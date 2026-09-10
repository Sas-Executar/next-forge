import { expect, test } from "@playwright/test";

const TITLE_PATTERN = /Welcome back/;

/**
 * M17-T01 — the one spec in this suite that doesn't need
 * `E2E_CLERK_USER_EMAIL`/a live database: it only proves the
 * unauthenticated `/sign-in` route renders Clerk's own `<SignIn/>`
 * component without erroring. Still needs a real
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for Clerk to mount at all — this
 * repo has none in CI/this sandbox (see apps/app/e2e/README.md).
 * Deliberately does not assert on Clerk's own internal DOM structure
 * (class names, field names) — that's Clerk's implementation detail,
 * not this codebase's, and would break on every Clerk SDK bump for no
 * reason connected to this repo's own code.
 */
test("sign-in page renders without error", async ({ page }) => {
  const response = await page.goto("/sign-in");
  expect(response?.ok()).toBe(true);
  // "Welcome back" is this route's own <title> (page.tsx's `metadata`),
  // not Clerk's internal markup — safe to assert on.
  await expect(page).toHaveTitle(TITLE_PATTERN);
});
