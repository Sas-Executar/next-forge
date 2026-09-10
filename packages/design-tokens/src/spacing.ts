/** Spacing scale — ported verbatim from the Blueprint source (px). */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
  24: 96,
  32: 128,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Container widths — ported verbatim from the Blueprint source (px). */
export const container = {
  page: 1200,
  reading: 720,
} as const;
