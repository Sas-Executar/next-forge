import { z } from "zod";

/**
 * Evidence epistemic classification (D9). Two vocabularies coexist in the
 * Blueprint (read-only) for the same five grades:
 * - AGENTS.md (repo-wide):        OBSERVED, PRIMARY, PUBLISHED, INTERNAL, INFERRED
 * - skills/executar-mapa-os/references/mapa-os-contract.md (concrete enum):
 *   A_OBSERVADO, B_PRIMARIO, C_PUBLICADO, D_INTERNO, E_INFERIDO
 *
 * This schema uses the mapa-os-contract literal values as canonical (it's
 * the more concrete, ordinal-prefixed enum) and carries the AGENTS.md
 * English names as documentation below, not as separate values — don't
 * add a second enum for them.
 */
export const evidenceGradeSchema = z.enum([
  "A_OBSERVADO", // OBSERVED
  "B_PRIMARIO", // PRIMARY
  "C_PUBLICADO", // PUBLISHED
  "D_INTERNO", // INTERNAL
  "E_INFERIDO", // INFERRED
]);

export type EvidenceGrade = z.infer<typeof evidenceGradeSchema>;
