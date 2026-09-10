import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * All optional: every adapter degrades honestly (an unconfigured
 * provider returns a real "not configured" error, same as M06's AI
 * router and M10's email/WhatsApp delivery) rather than being wired
 * behind a single all-or-nothing required var.
 *
 * INTEGRATIONS_ENCRYPTION_KEY is the one exception with teeth: without
 * it, packages/integrations/src/crypto.ts refuses to encrypt or decrypt
 * (throws, never falls back to storing plaintext) — see that file's own
 * comment. A 32-byte key, base64-encoded (openssl rand -base64 32).
 */
export const keys = () =>
  createEnv({
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      INTEGRATIONS_ENCRYPTION_KEY: z.string().min(1).optional(),

      // WhatsApp (Meta Cloud API) — M11-T01. WHATSAPP_ACCESS_TOKEN is a
      // System User token (Meta Cloud API's direct-integration model has
      // no per-workspace OAuth login the way Gmail/Outlook do), scoped
      // at the app level; WHATSAPP_APP_SECRET verifies inbound webhook
      // signatures (X-Hub-Signature-256).
      WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
      WHATSAPP_APP_SECRET: z.string().min(1).optional(),
      WHATSAPP_API_VERSION: z.string().min(1).optional(),

      // Gmail — M11-T02. OAuth 2.0 (per-workspace connection); Pub/Sub
      // push delivery authenticates via a Google-signed OIDC token,
      // verified against GOOGLE_PUBSUB_AUDIENCE (the push endpoint URL
      // configured on the subscription), not a shared secret.
      GMAIL_CLIENT_ID: z.string().min(1).optional(),
      GMAIL_CLIENT_SECRET: z.string().min(1).optional(),
      GMAIL_REDIRECT_URI: z.string().min(1).optional(),
      GOOGLE_PUBSUB_AUDIENCE: z.string().min(1).optional(),

      // Outlook / Microsoft 365 — M11-T03. OAuth 2.0 against the
      // Microsoft identity platform (v2.0 endpoint, common tenant).
      OUTLOOK_CLIENT_ID: z.string().min(1).optional(),
      OUTLOOK_CLIENT_SECRET: z.string().min(1).optional(),
      OUTLOOK_REDIRECT_URI: z.string().min(1).optional(),
    },
    runtimeEnv: {
      INTEGRATIONS_ENCRYPTION_KEY: process.env.INTEGRATIONS_ENCRYPTION_KEY,
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
      WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION,
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
      GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI,
      GOOGLE_PUBSUB_AUDIENCE: process.env.GOOGLE_PUBSUB_AUDIENCE,
      OUTLOOK_CLIENT_ID: process.env.OUTLOOK_CLIENT_ID,
      OUTLOOK_CLIENT_SECRET: process.env.OUTLOOK_CLIENT_SECRET,
      OUTLOOK_REDIRECT_URI: process.env.OUTLOOK_REDIRECT_URI,
    },
  });
