/**
 * Radius scale (ADR-DS-001 Required Change #7 — normalization).
 *
 * The Blueprint's canonical scale is 4/8/12/16px. Until this ADR,
 * packages/design-system/styles/globals.css deliberately did NOT wire
 * these under --radius-sm/md/lg/xl, because Tailwind's own
 * --radius-sm/md/lg/xl were calc()-derived from a single --radius token
 * (0.625rem = 10px) and already drove every shadcn component
 * (giving 6/8/10/14px — close to, but not equal to, the canonical scale).
 *
 * This file is now the SOT for both: `sm/md/lg/xl` below ARE the
 * canonical 4/8/12/16px values, and css/variables.css's `--radius-*`
 * exports them directly (no calc()) so shadcn's Tailwind theme consumes
 * the real scale, not a derived approximation.
 */
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
