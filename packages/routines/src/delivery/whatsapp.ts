import { getConnection, sendWhatsAppMessage } from "@repo/integrations";

export interface WhatsAppDeliveryInput {
  readonly recipient_ref: string;
  readonly report_url: string;
  readonly text: string;
  readonly workspaceId: string;
}

export interface WhatsAppDeliveryOutput {
  readonly error: string | null;
  readonly provider_message_id: string | null;
  readonly status: "sent" | "failed";
}

/**
 * whatsapp channel (§8) — real adapter (M11-T05, packages/integrations'
 * Meta Cloud API client), replacing M10's WHATSAPP_DELIVERY_ENABLED
 * stub now that a real provider exists. Still never fabricates "sent":
 * a workspace with no CONNECTED WhatsApp IntegrationConnection, or a
 * Cloud API call that itself fails, both return a real, honest failed
 * result — the same "no config" degradation pattern as email.ts and
 * M06's AI router.
 *
 * `recipient_ref` is the destination WhatsApp number (E.164, no `+`),
 * matching the Cloud API's own `to` field — RoutineConfig.delivery
 * doesn't further qualify the format, so this trusts the config as
 * authored rather than validating phone numbers here.
 */
export const sendWhatsAppDelivery = async (
  input: WhatsAppDeliveryInput
): Promise<WhatsAppDeliveryOutput> => {
  const connection = await getConnection(input.workspaceId, "WHATSAPP");
  if (
    !(
      connection &&
      connection.status === "CONNECTED" &&
      connection.externalAccountId
    )
  ) {
    return {
      status: "failed",
      provider_message_id: null,
      error:
        "No CONNECTED WhatsApp IntegrationConnection for this workspace — nothing to send from.",
    };
  }

  const result = await sendWhatsAppMessage({
    phoneNumberId: connection.externalAccountId,
    to: input.recipient_ref,
    text: `${input.text}\n${input.report_url}`,
  });

  return {
    status: result.status,
    provider_message_id: result.providerMessageId,
    error: result.error,
  };
};
