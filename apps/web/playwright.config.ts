import { defineConfig, devices } from "@playwright/test";

/**
 * M17-T01 — real Playwright config for apps/web's own E2E suite
 * (apps/web/e2e/**), scoped to this app's own package.json/node_modules
 * (`pricing.spec.ts` imports `@repo/billing/plans`, already a real
 * dependency of this app since M14). Started against a real
 * `bun run dev` server, never a mock.
 *
 * Could not be executed in this milestone's own sandbox — see
 * apps/web/e2e/README.md for exactly why (reproduced, not assumed).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
