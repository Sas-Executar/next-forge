import { z } from "zod";

/**
 * WorkflowDefinition shape (M10-T05, GAP resolution). No Blueprint
 * document specifies triggers/steps/conditions/actions/retries for
 * Workflows — OBJETIVOS E OUTPUT REQUIREMNETS.md §20 is a bare
 * requirement list with no schema, and the Prisma model's own comment
 * (packages/database, M02) already flags this: "kept as Json pending a
 * real WorkflowDefinition spec." Per the plan's GAP-resolution policy
 * (same approach as M06-T05's system prompt, M07's Prisma A4 field
 * limits): this is deliberately minimal, code-authored content, not a
 * transcription of a Blueprint contract — a real starting point for the
 * WorkflowDefinition.definition Json column, not a claim that it covers
 * §20's full breadth.
 */
export const workflowStepSchema = z.object({
  id: z.string(),
  action: z.enum(["create_task", "notify"]),
  params: z.record(z.string(), z.unknown()),
});
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const workflowDefinitionConfigSchema = z.object({
  trigger: z.object({
    type: z.enum(["manual", "schedule"]),
    schedule: z.string().nullable(),
  }),
  steps: z.array(workflowStepSchema).min(1),
});
export type WorkflowDefinitionConfig = z.infer<
  typeof workflowDefinitionConfigSchema
>;

export interface WorkflowStepResult {
  readonly action: string;
  readonly error: string | null;
  readonly status: "OK" | "FAILED";
  readonly stepId: string;
}
