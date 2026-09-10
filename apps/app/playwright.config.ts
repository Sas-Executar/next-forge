import { defineConfig, devices } from "@playwright/test";

/**
 * M17-T01 — real Playwright config for apps/app's own E2E suite
 * (apps/app/e2e/**), scoped to this app's own package.json/node_modules
 * so its specs can import `@repo/*` workspace packages the same way the
 * app itself does. Started against this app's own real `bun run dev`
 * server (`webServer`), never a mock.
 *
 * `app-setup` is a Clerk-specific setup project (see e2e/global.setup.ts
 * for why it's a project dependency here, not a top-level `globalSetup`
 * hook) — every other project depends on it so `clerk.signIn()`
 * (e2e/auth.ts) has a Testing Token ready.
 *
 * Could not be executed in this milestone's own sandbox — see
 * apps/app/e2e/README.md for exactly why (reproduced, not assumed).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "app-setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      testIgnore: /global\.setup\.ts/,
      dependencies: ["app-setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
