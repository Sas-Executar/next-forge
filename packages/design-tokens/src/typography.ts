/**
 * Typography tokens (ADR-DS-001 Required Change #3). The Blueprint
 * specifies IBM Plex Sans / IBM Plex Mono — this is the SOT declaration;
 * actually loading the fonts (next/font on web, expo-font on mobile) is
 * done once at each runtime's own font-loading entrypoint
 * (packages/design-system/lib/fonts.ts for web/storybook,
 * apps/mobile/app/_layout.tsx for Expo), both importing the family names
 * from here rather than hardcoding them a second time.
 */

export const fontFamily = {
  sans: "IBM Plex Sans",
  mono: "IBM Plex Mono",
} as const;

/** CSS-ready stacks with the same fallbacks already used in globals.css. */
export const fontFamilyCss = {
  sans: `${fontFamily.sans}, -apple-system, "Segoe UI", sans-serif`,
  mono: `${fontFamily.mono}, SFMono-Regular, Consolas, monospace`,
} as const;

export const fontSize = {
  display: 56,
  h1: 44,
  h2: 34,
  h3: 26,
  title: 20,
  subtitle: 18,
  "body-lg": 18,
  body: 16,
  "body-sm": 14,
  caption: 12,
  label: 13,
  button: 15,
  overline: 11,
  "mono-data": 14,
} as const;

export const fontWeight = {
  bold: 700,
} as const;

export type FontSizeToken = keyof typeof fontSize;
