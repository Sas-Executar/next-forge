import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * WHATSAPP_DELIVERY_ENABLED gates the WhatsApp channel stub (plan §4,
 * M10-T04: "stub behind a feature flag until M11 lands the real
 * integration"). A plain env var, not packages/feature-flags' Vercel
 * Flags SDK (createFlag) — that machinery (Edge Config, the toolbar)
 * is real infrastructure for user-facing experiments; this is a single
 * "is the real adapter wired yet" boolean with one true answer today
 * (no), so pulling in the full flags stack for it would be its own
 * kind of overbuild.
 */
export const keys = () =>
  createEnv({
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      WHATSAPP_DELIVERY_ENABLED: z
        .string()
        .optional()
        .transform((value) => value === "true"),
    },
    runtimeEnv: {
      WHATSAPP_DELIVERY_ENABLED: process.env.WHATSAPP_DELIVERY_ENABLED,
    },
  });
