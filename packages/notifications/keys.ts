import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      KNOCK_SECRET_API_KEY: z.string().optional(),
      // The Knock push channel this workspace's Expo push tokens are
      // registered against (M08-T03) — distinct from
      // NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID, which is the in-app feed
      // channel apps/app's web UI already reads.
      KNOCK_PUSH_CHANNEL_ID: z.string().optional(),
    },
    client: {
      NEXT_PUBLIC_KNOCK_API_KEY: z.string().optional(),
      NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: z.string().optional(),
    },
    runtimeEnv: {
      NEXT_PUBLIC_KNOCK_API_KEY: process.env.NEXT_PUBLIC_KNOCK_API_KEY,
      NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID:
        process.env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID,
      KNOCK_SECRET_API_KEY: process.env.KNOCK_SECRET_API_KEY,
      KNOCK_PUSH_CHANNEL_ID: process.env.KNOCK_PUSH_CHANNEL_ID,
    },
  });
