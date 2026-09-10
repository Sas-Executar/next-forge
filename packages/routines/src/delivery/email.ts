import { resend } from "@repo/email";
import { keys as emailKeys } from "@repo/email/keys";

export interface EmailDeliveryInput {
  readonly html: string;
  readonly subject: string;
  readonly text: string;
  readonly to_ref: string;
}

export interface EmailDeliveryOutput {
  readonly error: string | null;
  readonly provider_message_id: string | null;
  readonly status: "sent" | "failed";
}

/**
 * email channel (§8), real Resend send — not a stub. Degrades honestly
 * (a real "failed" output, never a fabricated "sent") when
 * RESEND_TOKEN/RESEND_FROM aren't configured, same pattern M06's
 * /api/chat route uses for a missing OPENAI_API_KEY.
 */
export const sendEmailDelivery = async (
  input: EmailDeliveryInput
): Promise<EmailDeliveryOutput> => {
  if (!resend) {
    return {
      status: "failed",
      provider_message_id: null,
      error: "RESEND_TOKEN not configured",
    };
  }
  const from = emailKeys().RESEND_FROM;
  if (!from) {
    return {
      status: "failed",
      provider_message_id: null,
      error: "RESEND_FROM not configured",
    };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: input.to_ref,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (result.error) {
      return {
        status: "failed",
        provider_message_id: null,
        error: result.error.message,
      };
    }
    return {
      status: "sent",
      provider_message_id: result.data?.id ?? null,
      error: null,
    };
  } catch (error) {
    return {
      status: "failed",
      provider_message_id: null,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
};
