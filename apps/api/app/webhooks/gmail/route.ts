import {
  emitIntegrationEvent,
  normalizeExternalObject,
  parseGmailPushPayload,
  resolveConnectionByExternalAccount,
  verifyPubSubPushToken,
} from "@repo/integrations";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";

/**
 * Google Cloud Pub/Sub push delivery for Gmail's `users.watch`
 * notifications (M11-T02, T06). Authenticates the request via
 * verifyPubSubPushToken() (see packages/integrations/src/gmail/webhook.ts
 * for exactly how — no JWT library, real verification against Google's
 * tokeninfo endpoint). GOOGLE_PUBSUB_AUDIENCE unset means "not
 * configured", not "trust anything" — the route returns 403.
 */
export const POST = async (request: Request): Promise<Response> => {
  const authorized = await verifyPubSubPushToken(
    request.headers.get("authorization")
  );
  if (!authorized) {
    log.warn("Gmail webhook: Pub/Sub push token verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  const envelope = (await request.json()) as Parameters<
    typeof parseGmailPushPayload
  >[0];
  const { emailAddress, event } = parseGmailPushPayload(envelope);

  if (!(emailAddress && event)) {
    return NextResponse.json({ ok: true, normalized: 0 });
  }

  const connection = await resolveConnectionByExternalAccount(
    "GMAIL",
    emailAddress
  );
  if (!connection) {
    log.warn("Gmail webhook: no IntegrationConnection for address", {
      emailAddress,
    });
    return NextResponse.json({ ok: true, normalized: 0 });
  }

  await normalizeExternalObject(connection.workspaceId, connection.id, event);
  await emitIntegrationEvent(
    connection.workspaceId,
    "channel.message_received",
    event.externalId,
    { provider: "GMAIL" }
  );

  return NextResponse.json({ ok: true, normalized: 1 });
};
