import { z } from "zod";

/**
 * Who/what performed a mutation (D9). Mirrors the Prisma `ActorType` enum
 * (packages/database/prisma/schema.prisma, AuditEvent.actorType) —
 * core domain invariant across the Blueprint (read-only, ADR-ROUTINES-001):
 * "toda mutação automática deve indicar a regra que a autorizou".
 */
export const actorTypeSchema = z.enum(["USER", "AGENT", "SYSTEM"]);

export type ActorType = z.infer<typeof actorTypeSchema>;
