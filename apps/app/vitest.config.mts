import path from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // M17-T01 — e2e/**'s .spec.ts files are real Playwright specs, run
    // via `bun run e2e` (apps/app/playwright.config.ts), not vitest.
    // Playwright's own test() throws if vitest tries to import them.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
    },
  },
});
