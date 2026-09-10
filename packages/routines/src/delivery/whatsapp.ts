import { keys } from "../../keys";

export interface WhatsAppDeliveryInput {
  readonly recipient_ref: string;
  readonly report_url: string;
  readonly text: string;
}

export interface WhatsAppDeliveryOutput {
  readonly error: string | null;
  readonly provider_message_id: string | null;
  readonly status: "sent" | "failed";
}

/**
 * whatsapp channel (§8), stub behind WHATSAPP_DELIVERY_ENABLED until
 * M11 wires the real Meta Cloud API adapter (plan §4, M11-T01). Never
 * fabricates "sent" — with the flag unset (the default) or set, this
 * always returns a real, honest failure, since no provider exists yet
 * either way.
 */
export const sendWhatsAppDelivery = (
  _input: WhatsAppDeliveryInput
): Promise<WhatsAppDeliveryOutput> => {
  if (!keys().WHATSAPP_DELIVERY_ENABLED) {
    return Promise.resolve({
      status: "failed",
      provider_message_id: null,
      error:
        "WhatsApp delivery is disabled (WHATSAPP_DELIVERY_ENABLED unset) — no provider wired yet (M11).",
    });
  }
  return Promise.resolve({
    status: "failed",
    provider_message_id: null,
    error: "WhatsApp delivery is enabled but no provider is wired yet (M11).",
  });
};
