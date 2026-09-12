"use server";

import { requireRole } from "@repo/auth/server";
import type { IntegrationProvider } from "@repo/database";
import { disconnectConnection } from "@repo/integrations";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const disconnectSchema = z.object({
  provider: z.enum(["WHATSAPP", "GMAIL", "OUTLOOK"]),
});

export const disconnectIntegration = async (input: {
  readonly provider: IntegrationProvider;
}) => {
  const { provider } = disconnectSchema.parse(input);
  const { workspace } = await requireRole("OWNER");

  await disconnectConnection(workspace.id, provider);

  revalidatePath("/integrations");
};
