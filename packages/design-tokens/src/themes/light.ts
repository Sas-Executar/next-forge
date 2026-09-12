import { azure, green, neutral } from "../primitives";
import type { SemanticTokens } from "../semantic";
import { statusFallbackLight } from "../semantic";

/**
 * Light theme — the EXECUTAR default. Resolves every semantic token to a
 * Blueprint ramp step, mirroring the shadcn remapping already established
 * in packages/design-system/styles/globals.css's `:root` block (background
 * → neutral-1, primary → green-9, accent/ring → azure-3/azure-8, etc.) so
 * this SOT and that file agree on the same visual result.
 */
export const light: SemanticTokens = {
  color: {
    background: neutral[1],
    surface: neutral[2],
    text: {
      primary: neutral[12],
      secondary: neutral[10],
    },
    action: {
      primary: green[9],
      secondary: neutral[3],
    },
    status: {
      success: green[9],
      warning: statusFallbackLight.warning,
      error: statusFallbackLight.error,
    },
    border: neutral[5],
    focus: azure[8],
  },
};
