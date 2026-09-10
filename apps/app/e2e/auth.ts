import { clerk } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";

/**
 * M17-T01 — signs a real Playwright page in as the E2E test Clerk user,
 * via Clerk's own documented `clerk.signIn({ page, emailAddress })`
 * helper (`@clerk/testing/playwright`): it creates a server-side token
 * through the Backend API and bypasses interactive verification
 * entirely, which is why it needs `CLERK_SECRET_KEY`, not just the
 * publishable key.
 *
 * `E2E_CLERK_USER_EMAIL` must name a real user that already exists in
 * whichever Clerk instance `CLERK_SECRET_KEY` points at — this repo
 * does not create one; that's an ops/seed-data step outside this
 * milestone's scope (see apps/app/e2e/README.md).
 *
 * Per Clerk's own documented constraint: must be called after
 * navigating to an unprotected page that loads Clerk (the sign-in page
 * itself qualifies) — never before any Clerk-aware page has loaded.
 */
export const signInAsE2eUser = async (page: Page): Promise<void> => {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) {
    throw new Error(
      "E2E_CLERK_USER_EMAIL is not set — see apps/app/e2e/README.md for what this suite needs to actually run."
    );
  }

  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });
};
