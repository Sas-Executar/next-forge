/**
 * Expo inlines any `EXPO_PUBLIC_*` variable from `.env`/the build
 * environment directly into the bundle at build time (its own
 * documented mechanism — https://docs.expo.dev/guides/environment-variables/),
 * unlike the Next.js apps in this repo, which validate env vars through
 * `@t3-oss/env-nextjs` (a Next.js-specific package, not usable here).
 * This file exists only to centralize and type that access in one
 * place, matching this repo's "one keys/env module per app" convention
 * without pulling in machinery Expo doesn't need.
 */
export const env = {
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "",
} as const;
