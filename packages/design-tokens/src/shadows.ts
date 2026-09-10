/** Shadow scale — ported verbatim from the Blueprint source. */
export const shadow = {
  sm: "0 1px 2px rgba(20, 20, 20, 0.04)",
  md: "0 4px 12px rgba(20, 20, 20, 0.06)",
  hover: "0 4px 16px rgba(20, 20, 20, 0.08)",
} as const;

export type ShadowToken = keyof typeof shadow;
