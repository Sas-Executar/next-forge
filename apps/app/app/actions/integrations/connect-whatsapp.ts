"use server";

import { requireRole } from "@repo/auth/server";
import { upsertConnection } from "@repo/integrations";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const connectWhatsAppSchema = z.object({
  phoneNumberId: z.string().min(1),
});

/**
 * WhatsApp has no per-workspace OAuth login the way Gmail/Outlook do —
 * the Meta Cloud API's direct-integration model authenticates with one
 * app-level System User token (WHATSAPP_ACCESS_TOKEN), and a workspace
 * only needs to record *which* Meta phone_number_id it sends/receives
 * from. So "connect" here is simply recording that id, entered by an
 * OWNER from their own Meta Business Manager — not an OAuth exchange.
 */
export const connectWhatsApp = async (input: {
  readonly phoneNumberId: string;
}) => {
  const { phoneNumberId } = connectWhatsAppSchema.parse(input);
  const { workspace } = await requireRole("OWNER");

  await upsertConnection(workspace.id, "WHATSAPP", {
    externalAccountId: phoneNumberId,
  });

  revalidatePath("/integrations");
};
