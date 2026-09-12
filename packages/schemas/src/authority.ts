import { z } from "zod";

/**
 * Behavior authority classification (D9).
 *
 * Source: skills/executar-mapa-os/references/mapa-os-contract.md
 * (Blueprint, read-only).
 */
export const behaviorAuthoritySchema = z.enum([
  "DETERMINISTICO",
  "INTERPRETATIVO",
  "EXIGE_HUMANO",
  "NAO_DETERMINADO",
]);

export type BehaviorAuthority = z.infer<typeof behaviorAuthoritySchema>;
