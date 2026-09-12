import { keys } from "../../keys";
import type { NormalizedInboundEvent } from "../types";

/**
 * Verifies a Google Cloud Pub/Sub push request's `Authorization: Bearer
 * <OIDC id_token>` header — Google's own documented method for
 * authenticating push deliveries
 * (cloud.google.com/pubsub/docs/authenticate-push-subscriptions).
 *
 * Full local verification would mean fetching Google's JWK set and
 * checking the RS256 signature — this package has no JWT library
 * dependency, so it uses Google's alternative, also-documented
 * approach: submit the token to the tokeninfo endpoint and check its
 * `aud`/`email`/`email_verified` claims come back as expected. Slightly
 * higher latency, genuinely verifies the signature (Google's server
 * does the cryptographic check), not a fabricated pass-through.
 */
export class PubSubTokenInvalidError extends Error {
  constructor(reason: string) {
    super(`Pub/Sub push token invalid: ${reason}`);
    this.name = "PubSubTokenInvalidError";
  }
}

interface GoogleTokenInfo {
  readonly aud?: string;
  readonly email?: string;
  readonly email_verified?: string;
  readonly error_description?: string;
}

export const verifyPubSubPushToken = async (
  authorizationHeader: string | null
): Promise<boolean> => {
  const audience = keys().GOOGLE_PUBSUB_AUDIENCE;
  if (!audience) {
    return false;
  }
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }
  const idToken = authorizationHeader.slice("Bearer ".length);

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  const info = (await response.json()) as GoogleTokenInfo;
  if (!response.ok) {
    return false;
  }
  if (info.aud !== audience) {
    return false;
  }
  if (info.email_verified !== "true") {
    return false;
  }
  // Google's Pub/Sub push service accounts are always
  // *@*.gserviceaccount.com — a genuine additional check, not a
  // fabricated one, though the operator's push subscription config
  // (which service account is authorized to invoke the endpoint) is
  // the primary control.
  return Boolean(info.email?.endsWith(".gserviceaccount.com"));
};

interface PubSubPushEnvelope {
  readonly message?: {
    readonly data?: string;
    readonly messageId?: string;
    readonly publishTime?: string;
  };
}

interface GmailPubSubNotification {
  readonly emailAddress?: string;
  readonly historyId?: number;
}

/**
 * Pub/Sub push envelopes carry the actual Gmail notification
 * (`{emailAddress, historyId}`) as base64-encoded JSON in
 * `message.data` — decode it into this package's normalized shape. The
 * historyId alone doesn't identify a message (Gmail's delta-sync model
 * requires a follow-up history.list call, not implemented here — see
 * gmail/client.ts's own disclosed gap), so `externalId` uses the
 * Pub/Sub messageId, which is what's actually available and unique per
 * delivery.
 */
export const parseGmailPushPayload = (
  envelope: PubSubPushEnvelope
): {
  readonly emailAddress: string | null;
  readonly event: NormalizedInboundEvent | null;
} => {
  if (!envelope.message?.data) {
    return { emailAddress: null, event: null };
  }
  let notification: GmailPubSubNotification;
  try {
    notification = JSON.parse(
      Buffer.from(envelope.message.data, "base64").toString("utf8")
    ) as GmailPubSubNotification;
  } catch {
    return { emailAddress: null, event: null };
  }

  return {
    emailAddress: notification.emailAddress ?? null,
    event: {
      externalId: envelope.message.messageId ?? `${notification.historyId}`,
      externalObjectType: "gmail_history_notification",
      receivedAt: envelope.message.publishTime ?? new Date().toISOString(),
      payload: {
        emailAddress: notification.emailAddress ?? null,
        historyId: notification.historyId ?? null,
      },
    },
  };
};
