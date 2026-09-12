import {
  emitIntegrationEvent,
  normalizeExternalObject,
  parseWhatsAppWebhookPayload,
  resolveConnectionByExternalAccount,
  verifyWhatsAppHandshake,
  verifyWhatsAppSignature,
} from "@repo/integrations";
import { keys as integrationKeys } from "@repo/integrations/keys";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { env } from "@/env";

/**
 * GET is Meta's one-time subscription verification handshake
 * (developers.facebook.com/docs/graph-api/webhooks/getting-started) —
 * echoes hub.challenge as plain text when hub.verify_token matches.
 */
export const GET = (request: Request): Response => {
  if (!env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ message: "Not configured", ok: false });
  }
  const { searchParams } = new URL(request.url);
  const challenge = verifyWhatsAppHandshake(
    searchParams,
    env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  );
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
};

/**
 * POST delivers inbound WhatsApp messages (M11-T01, T06). Every event
 * is normalized into ExternalObjectRef (PRD-OMNI-001) against the
 * IntegrationConnection resolved by phone_number_id — cross-tenant
 * discovery via resolveConnectionByExternalAccount(), then every
 * further read/write scopes through forWorkspace(connection.workspaceId)
 * inside normalizeExternalObject/emitIntegrationEvent, never a raw
 * client.
 */
export const POST = async (request: Request): Promise<Response> => {
  const appSecret = integrationKeys().WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ message: "Not configured", ok: false });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
    log.warn("WhatsApp webhook: signature verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  const payload: unknown = JSON.parse(rawBody);
  const { phoneNumberId, events } = parseWhatsAppWebhookPayload(payload);

  if (!phoneNumberId) {
    // Nothing recognizable to route — still 200, since Meta retries
    // (and eventually disables) a webhook that doesn't acknowledge.
    return NextResponse.json({ ok: true, normalized: 0 });
  }

  const connection = await resolveConnectionByExternalAccount(
    "WHATSAPP",
    phoneNumberId
  );
  if (!connection) {
    log.warn("WhatsApp webhook: no IntegrationConnection for phone_number_id", {
      phoneNumberId,
    });
    return NextResponse.json({ ok: true, normalized: 0 });
  }

  for (const event of events) {
    await normalizeExternalObject(connection.workspaceId, connection.id, event);
    await emitIntegrationEvent(
      connection.workspaceId,
      "channel.message_received",
      event.externalId,
      { provider: "WHATSAPP" }
    );
  }

  return NextResponse.json({ ok: true, normalized: events.length });
};
