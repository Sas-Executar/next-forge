import { keys } from "../../keys";

export interface SendWhatsAppMessageInput {
  readonly phoneNumberId: string;
  readonly text: string;
  readonly to: string;
}

export interface SendWhatsAppMessageResult {
  readonly error: string | null;
  readonly providerMessageId: string | null;
  readonly status: "sent" | "failed";
}

const DEFAULT_API_VERSION = "v21.0";

/**
 * Real Meta Cloud API call (plan D-decision for M11-T01: direct Cloud
 * API, not a BSP like Twilio — see modelo de negocio.md:436). Genuine
 * fetch to graph.facebook.com; requires WHATSAPP_ACCESS_TOKEN (a
 * System User token) since the Cloud API's direct-integration model has
 * no per-workspace OAuth token the way Gmail/Outlook do — one app-level
 * token sends on behalf of every phone number the app manages, and
 * `phoneNumberId` (from the workspace's IntegrationConnection) is what
 * selects which sender.
 */
export const sendWhatsAppMessage = async (
  input: SendWhatsAppMessageInput
): Promise<SendWhatsAppMessageResult> => {
  const config = keys();
  if (!config.WHATSAPP_ACCESS_TOKEN) {
    return {
      status: "failed",
      providerMessageId: null,
      error: "WHATSAPP_ACCESS_TOKEN is not configured.",
    };
  }

  const apiVersion = config.WHATSAPP_API_VERSION ?? DEFAULT_API_VERSION;
  const url = `https://graph.facebook.com/${apiVersion}/${input.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to,
        type: "text",
        text: { body: input.text },
      }),
    });

    const body = (await response.json()) as {
      messages?: ReadonlyArray<{ id: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        status: "failed",
        providerMessageId: null,
        error: body.error?.message ?? `HTTP ${response.status}`,
      };
    }

    return {
      status: "sent",
      providerMessageId: body.messages?.[0]?.id ?? null,
      error: null,
    };
  } catch (error) {
    return {
      status: "failed",
      providerMessageId: null,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
};
