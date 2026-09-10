import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as database } from "@repo/database/keys";
import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as payments } from "@repo/payments/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  extends: [
    auth(),
    analytics(),
    core(),
    database(),
    email(),
    observability(),
    payments(),
  ],
  server: {
    // Verifies /cron/routines requests (M10-T03) — unlike keep-alive
    // (a no-op), this cron mutates real workspace data across every
    // enabled routine, so it's worth gating even though Vercel's own
    // cron infra already restricts who can trigger it in production.
    // Optional: unset means the check is skipped, same "not configured
    // yet" honesty as every other optional secret in this repo.
    CRON_SECRET: z.string().min(1).optional(),
  },
  client: {},
  runtimeEnv: {
    CRON_SECRET: process.env.CRON_SECRET,
  },
});
