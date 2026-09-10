import { z } from "zod";

/**
 * RoutineConfig (SPEC-ROUTINES-001 §2, Blueprint read-only), the shape
 * stored in the Routine.config Json column (packages/database, M02).
 * `routine_id`/`name`/`description`/`status` aren't repeated here — the
 * Routine row already has its own id/name/description/status columns
 * (see the M02 comment on that model); this schema is only the portion
 * the Prisma model itself calls out as living in `config`: scope,
 * trigger, sources, execution_policy, report, delivery, retry.
 */
export const routineScopeSchema = z.object({
  project_id: z.string().nullable(),
  filters: z.array(z.string()).optional(),
});

export const routineTriggerSchema = z.object({
  type: z.literal("schedule"),
  schedule: z.string(),
  timezone: z.string(),
});

/**
 * `provider: "internal"` is this implementation's own convention, not a
 * Blueprint-specified value — it means "this workspace's own canonical
 * store," always readable. Any other provider has no real SourceAdapter
 * yet (external connectors are M11) — pipeline.ts treats a required
 * non-internal source as unavailable, per §5 step 5, rather than
 * pretending to read it.
 */
export const routineSourceSchema = z.object({
  source_id: z.string(),
  provider: z.string(),
  role: z.enum([
    "state_authority",
    "definition_authority",
    "mirror",
    "evidence",
  ]),
  required: z.boolean(),
});

export const routineExecutionPolicySchema = z.object({
  wip_limit: z.number().int().min(1),
  eligibility_policy: z.string(),
  tie_policy: z.string(),
  allowed_mutations: z.array(z.string()),
  blocked_mutations: z.array(z.string()),
});

export const routineReportConfigSchema = z.object({
  template_id: z.string(),
  schema: z.string(),
});

export const routineDeliveryChannelSchema = z.object({
  channel: z.enum(["app_reports", "email", "whatsapp"]),
  enabled: z.boolean(),
  recipient_ref: z.string().nullable().optional(),
});

export const routineRetryPolicySchema = z.object({
  max_attempts: z.number().int().min(0),
  backoff: z.string(),
});

export const routineConfigSchema = z.object({
  scope: routineScopeSchema,
  trigger: routineTriggerSchema,
  sources: z.array(routineSourceSchema).min(1),
  execution_policy: routineExecutionPolicySchema,
  report: routineReportConfigSchema,
  delivery: z.array(routineDeliveryChannelSchema),
  retry: routineRetryPolicySchema,
});
export type RoutineConfig = z.infer<typeof routineConfigSchema>;

/** RoutineRun.mutations entry (§3) — matches the Prisma Json column shape. */
export const routineMutationSchema = z.object({
  object_id: z.string(),
  from: z.string(),
  to: z.string(),
  authority_rule_id: z.string(),
  evidence_refs: z.array(z.string()),
});
export type RoutineMutation = z.infer<typeof routineMutationSchema>;
