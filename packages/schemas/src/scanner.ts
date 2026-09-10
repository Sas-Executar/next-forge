import { z } from "zod";

/**
 * Visual Symbol Scanner vocabulary (M09, PRD-SCANNER-001's V1 table /
 * SPEC-SCANNER-001's Registry contract). Originally defined only as
 * Prisma enums (VisualSymbolSemantic/VisualCommand, M02's
 * schema.prisma) with that file's own comment flagging them as
 * "schema-local... promote to packages/schemas if/when another
 * package needs to reference them by type" — packages/scanner (M09)
 * is that package: it must stay usable from apps/mobile's React Native
 * bundle, which cannot import @repo/database (server-only, Node-only
 * Postgres driver) the way every Next.js app in this repo does. Same
 * cross-package/cross-app reasoning as D9's TaskState.
 *
 * Values are kept in lockstep by hand with schema.prisma's
 * VisualSymbolSemantic/VisualCommand enums, same discipline as every
 * other D9-mirrored enum in this repo.
 */
export const visualSymbolSemanticSchema = z.enum(["CHAT", "SELECTOR", "DONE"]);
export type VisualSymbolSemantic = z.infer<typeof visualSymbolSemanticSchema>;

export const visualCommandSchema = z.enum([
  "OPEN_CHAT",
  "OPEN_SELECTOR",
  "COMPLETE_LATEST_OPEN_TASK",
]);
export type VisualCommand = z.infer<typeof visualCommandSchema>;
