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
  // M09-T01's on-device counterpart to scripts/fetch-model.ts's
  // DINOV2_MODEL_URL/DINOV2_MODEL_SHA256 — unset in this sandbox for
  // the same reason (see that script's own header comment): no real
  // GitHub Release for the DINOv2 ONNX artifact exists to point this
  // at. EXPO_PUBLIC_ prefix (not the script's plain env var names)
  // because this value needs to reach client bundle code, Expo's own
  // requirement for any env var read outside a build script.
  EXPO_PUBLIC_DINOV2_MODEL_URL: process.env.EXPO_PUBLIC_DINOV2_MODEL_URL ?? "",
  EXPO_PUBLIC_DINOV2_MODEL_SHA256:
    process.env.EXPO_PUBLIC_DINOV2_MODEL_SHA256 ?? "",
} as const;
