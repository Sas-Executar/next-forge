import { dark, light } from "@repo/design-tokens";

/**
 * ADR-DS-001 Required Change #4: real @repo/design-tokens values,
 * replacing Expo's own template defaults (tintColorLight #2f95dc,
 * #fff/#000 backgrounds, #ccc icons — none of them EXECUTAR tokens).
 *
 * Shape (text/background/tint/tabIconDefault/tabIconSelected) is kept
 * as-is — it's this file's own established contract, consumed by
 * components/themed.tsx's `useThemeColor` and app/(tabs)/_layout.tsx's
 * tab bar — only the values are now sourced from the SOT's semantic
 * layer (color.text.primary/secondary, color.background,
 * color.action.primary) instead of being hardcoded here.
 */
export default {
  light: {
    text: light.color.text.primary,
    background: light.color.background,
    tint: light.color.action.primary,
    tabIconDefault: light.color.text.secondary,
    tabIconSelected: light.color.action.primary,
  },
  dark: {
    text: dark.color.text.primary,
    background: dark.color.background,
    tint: dark.color.action.primary,
    tabIconDefault: dark.color.text.secondary,
    tabIconSelected: dark.color.action.primary,
  },
};
