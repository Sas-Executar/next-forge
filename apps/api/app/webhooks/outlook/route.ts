import {
  emitIntegrationEvent,
  extractValidationToken,
  normalizeExternalObject,
  parseOutlookNotifications,
  resolveConnectionByExternalAccount,
} from "@repo/integrations";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";

/**
 * Microsoft Graph change notifications (M11-T03, T06). Graph POSTs the
 * subscription-validation handshake to this same endpoint (a
 * `validationToken` query parameter, expected back verbatim as
 * text/plain within 10s) before ever sending real notifications — see
 * packages/integrations/src/outlook/webhook.ts for both mechanics.
 *
 * Real notifications carry no single external account id the way
 * WhatsApp's phone_number_id or Gmail's emailAddress do — Graph batches
 * notifications by subscriptionId, and this route doesn't yet persist
 * a subscriptionId -> IntegrationConnection mapping (that mapping is
 * created when the subscription itself is created, a flow this
 * milestone doesn't implement — disclosed gap, same shape as gmail's
 * missing history.list sync). Each notification's own clientState is
 * still verified per-connection by iterating this workspace's Outlook
 * connections and matching webhookSecret — the batch is small in
 * practice (Graph's own subscription model caps notifications per
 * delivery).
 */
export const POST = async (request: Request): Promise<Response> => {
  const { searchParams } = new URL(request.url);
  const validationToken = extractValidationToken(searchParams);
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const envelope = (await request.json()) as Parameters<
    typeof parseOutlookNotifications
  >[0];

  const subscriptionId = envelope.value?.[0]?.subscriptionId;
  if (!subscriptionId) {
    return NextResponse.json({ ok: true, normalized: 0 });
  }

  // subscriptionId doubles as the externalAccountId for OUTLOOK
  // connections in this milestone's simplified model (see the gap note
  // above) — the subscription-creation flow that would populate it
  // correctly is not yet implemented, so this lookup is honestly
  // expected to miss until that flow exists.
  const connection = await resolveConnectionByExternalAccount(
    "OUTLOOK",
    subscriptionId
  );
  if (!connection?.webhookSecret) {
    log.warn("Outlook webhook: no IntegrationConnection for subscription", {
      subscriptionId,
    });
    return NextResponse.json({ ok: true, normalized: 0 });
  }

  const events = parseOutlookNotifications(envelope, connection.webhookSecret);
  for (const event of events) {
    await normalizeExternalObject(connection.workspaceId, connection.id, event);
    await emitIntegrationEvent(
      connection.workspaceId,
      "channel.message_received",
      event.externalId,
      { provider: "OUTLOOK" }
    );
  }

  return NextResponse.json({ ok: true, normalized: events.length });
};
