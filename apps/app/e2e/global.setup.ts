import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

/**
 * M17-T01 — Clerk's own documented Playwright setup (`@clerk/testing`):
 * prepares a Testing Token so `clerk.signIn()` (auth.ts) can bypass
 * Clerk's bot-detection for the rest of this suite. Runs as its own
 * Playwright project (see playwright.config.ts's `app-setup` project,
 * a dependency of `app`) rather than a global `globalSetup` config hook
 * — that way it only ever runs for the `app` project, never for `web`
 * (apps/web has no Clerk dependency at all and shouldn't need
 * CLERK_SECRET_KEY just to run its own suite).
 *
 * Requires CLERK_SECRET_KEY (see apps/app/e2e/README.md).
 */
setup("clerk global setup", async () => {
  await clerkSetup();
});
