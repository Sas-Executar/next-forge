import { createHmac, timingSafeEqual } from "node:crypto";
import type { NormalizedInboundEvent } from "../types";

/**
 * Meta Cloud API's real webhook signature scheme (documented at
 * developers.facebook.com/docs/graph-api/webhooks/getting-started):
 * every POST carries `X-Hub-Signature-256: sha256=<hex hmac>` computed
 * over the *raw* request body with the app secret as key. Verify
 * against the raw text, not a re-serialized JSON.stringify(parsed) —
 * those are not guaranteed byte-identical.
 */
export const verifyWhatsAppSignature = (
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean => {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }
  const provided = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  // Buffers of different length would throw in timingSafeEqual rather
  // than just returning false — an invalid/truncated signature must
  // fail closed, not crash the route.
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
};

/**
 * GET webhook verification handshake Meta requires once, when the
 * webhook URL is registered: echo back `hub.challenge` only if
 * `hub.verify_token` matches the token this workspace's connection was
 * configured with.
 */
export const verifyWhatsAppHandshake = (
  params: URLSearchParams,
  expectedVerifyToken: string
): string | null => {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token === expectedVerifyToken && challenge) {
    return challenge;
  }
  return null;
};

interface WhatsAppWebhookMessage {
  readonly from: string;
  readonly id: string;
  readonly text?: { readonly body: string };
  readonly timestamp: string;
  readonly type: string;
}

interface WhatsAppWebhookPayload {
  readonly entry?: ReadonlyArray<{
    readonly changes?: ReadonlyArray<{
      readonly value?: {
        readonly metadata?: { readonly phone_number_id?: string };
        readonly messages?: readonly WhatsAppWebhookMessage[];
      };
    }>;
  }>;
}

/**
 * Extracts the real, documented shape of a WhatsApp Business Account
 * webhook payload (entry[].changes[].value.{metadata,messages}) into
 * this package's provider-agnostic NormalizedInboundEvent list, plus
 * the phone_number_id that resolveConnectionByExternalAccount()
 * resolves against. Malformed/unexpected payloads produce an empty
 * result rather than throwing — a webhook route must always 200 a
 * payload it can't parse (Meta retries and eventually disables the
 * webhook on repeated failures), it just normalizes nothing from it.
 */
export const parseWhatsAppWebhookPayload = (
  payload: unknown
): {
  readonly phoneNumberId: string | null;
  readonly events: readonly NormalizedInboundEvent[];
} => {
  const typed = payload as WhatsAppWebhookPayload;
  const events: NormalizedInboundEvent[] = [];
  let phoneNumberId: string | null = null;

  for (const entry of typed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (value?.metadata?.phone_number_id) {
        phoneNumberId = value.metadata.phone_number_id;
      }
      for (const message of value?.messages ?? []) {
        events.push({
          externalId: message.id,
          externalObjectType: "whatsapp_message",
          receivedAt: new Date(Number(message.timestamp) * 1000).toISOString(),
          payload: {
            from: message.from,
            type: message.type,
            text: message.text?.body ?? null,
          },
        });
      }
    }
  }

  return { phoneNumberId, events };
};
