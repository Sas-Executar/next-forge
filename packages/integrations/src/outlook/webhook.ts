import type { NormalizedInboundEvent } from "../types";

/**
 * Microsoft Graph change notifications (learn.microsoft.com/graph/
 * webhooks) have two real mechanics this file implements:
 *
 * 1. Subscription validation handshake: when a subscription is created
 *    (or renewed), Graph POSTs the endpoint with a `validationToken`
 *    query parameter and expects it echoed back verbatim as
 *    `text/plain`, HTTP 200, within 10 seconds — no signature involved,
 *    it just proves the endpoint is reachable and responsive.
 * 2. Per-notification authentication: `clientState`, a shared secret
 *    chosen when the subscription was created and stored on
 *    IntegrationConnection.webhookSecret, is echoed back on every
 *    notification. Not a cryptographic signature — Graph's own docs
 *    call this the verification mechanism, but it's checked with the
 *    same fail-closed discipline as WhatsApp's HMAC (constant-time
 *    string equality would be ideal; Graph's clientState is not a
 *    high-entropy MAC, so a strict `===` is the same rigor either
 *    library actually gets from a plain shared secret this short).
 */
export const extractValidationToken = (
  searchParams: URLSearchParams
): string | null => searchParams.get("validationToken");

interface GraphChangeNotification {
  readonly changeType: string;
  readonly clientState?: string;
  readonly resource: string;
  readonly resourceData?: { readonly id?: string };
  readonly subscriptionId: string;
}

interface GraphNotificationEnvelope {
  readonly value?: readonly GraphChangeNotification[];
}

export const parseOutlookNotifications = (
  envelope: GraphNotificationEnvelope,
  expectedClientState: string
): readonly NormalizedInboundEvent[] => {
  const events: NormalizedInboundEvent[] = [];
  for (const notification of envelope.value ?? []) {
    if (notification.clientState !== expectedClientState) {
      // Fails closed per-notification, not for the whole batch — a
      // batch can (rarely) mix subscriptions; skip only what doesn't
      // authenticate.
      continue;
    }
    const externalId =
      notification.resourceData?.id ?? notification.subscriptionId;
    events.push({
      externalId,
      externalObjectType: "outlook_message",
      receivedAt: new Date().toISOString(),
      payload: {
        resource: notification.resource,
        changeType: notification.changeType,
      },
    });
  }
  return events;
};
