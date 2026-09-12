import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
      // `server-only` throws unless imported through Next.js's bundler
      // (see __tests__/mocks/server-only.ts) — every module under test
      // here imports it, so alias it to a no-op for this config only.
      "server-only": path.resolve(
        import.meta.dirname,
        "./__tests__/mocks/server-only.ts"
      ),
    },
  },
});
