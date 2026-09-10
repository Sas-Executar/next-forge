"use server";

import { requireRole } from "@repo/auth/server";
import { runWorkflow } from "@repo/automation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const runWorkflowSchema = z.object({ workflowDefinitionId: z.string().min(1) });

/** Manual "Executar agora" trigger for /workflows (M10-T06). */
export const runWorkflowNow = async (input: {
  readonly workflowDefinitionId: string;
}) => {
  const { workflowDefinitionId } = runWorkflowSchema.parse(input);
  const { workspace } = await requireRole("MEMBER");

  const result = await runWorkflow(workspace.id, workflowDefinitionId);

  revalidatePath("/workflows");
  return result;
};
