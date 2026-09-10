import type {
  TaskState,
  VisualCommand,
  VisualSymbolSemantic,
} from "@repo/schemas";

// Deliberately from @repo/schemas, not @repo/database: this file (and
// everything that imports from it) must stay safe to bundle into
// apps/mobile's React Native app, which cannot import @repo/database
// (server-only, Node-only Postgres driver). See schema.prisma's own
// comment on VisualSymbolSemantic/VisualCommand for the mirroring
// discipline this follows. Re-exported as a separate `export type ...
// from` statement (rather than re-exporting the imported binding
// directly) per this repo's lint rule preferring that form — both
// statements are needed here since this file also uses the types
// locally (RegisteredSymbol, V1_SYMBOL_TO_COMMAND, ...), not just
// re-exports them.
export type { VisualCommand, VisualSymbolSemantic } from "@repo/schemas";

/**
 * V1 physical vocabulary (PRD-SCANNER-001's own table, 3 rows) —
 * exported as named constants rather than a literal-string union type
 * for VisualSymbolId: the registry is meant to hold future symbols
 * too (REQ-SCAN-004, enrollment), so a symbolId is `string` at the
 * type level, with these 3 as the concrete V1 seed.
 */
export const V1_SYMBOL_IDS = {
  CHAT: "SYM-CHAT-001",
  SELECTOR: "SYM-SELECTOR-001",
  DONE: "SYM-DONE-001",
} as const;

export const V1_SYMBOL_TO_COMMAND: Readonly<Record<string, VisualCommand>> = {
  [V1_SYMBOL_IDS.CHAT]: "OPEN_CHAT",
  [V1_SYMBOL_IDS.SELECTOR]: "OPEN_SELECTOR",
  [V1_SYMBOL_IDS.DONE]: "COMPLETE_LATEST_OPEN_TASK",
};

/**
 * Registry contract (SPEC-SCANNER-001 "Registry contract"). The spec's
 * own illustrative interface types `semantic` as the lowercase literals
 * `"chat"|"selector"|"done"`, but this repo's Prisma schema (M02,
 * unrelated to this milestone) already defines VisualSymbolSemantic as
 * the uppercase enum CHAT/SELECTOR/DONE, matching every other enum in
 * schema.prisma — code follows the DB schema's established convention
 * rather than the spec illustration's inconsistent casing, a disclosed
 * reconciliation, not a deviation from the spec's actual meaning.
 *
 * `embeddings: Float32Array[]` (plural, per spec) supports multiple
 * enrolled reference images per symbol — registerSymbol() may be
 * called more than once, or once with several images, and matching
 * takes the best similarity across all of them (see recognize.ts).
 */
export interface RegisteredSymbol {
  readonly command: VisualCommand;
  readonly embeddings: readonly Float32Array[];
  readonly enabled: boolean;
  readonly id: string;
  readonly semantic: VisualSymbolSemantic;
  readonly symbolId: string;
}

/**
 * Recognition output. SPEC-SCANNER-001 and API-SCANNER-ACTION-001 give
 * two slightly different shapes for this — `{symbolId: VisualSymbolId
 * | "UNKNOWN"; similarity}` in the former, `{status:"RECOGNIZED"|
 * "UNKNOWN", symbolId?, similarity?}` in the latter. This adopts the
 * Action Contract's discriminated union (the doc whose whole purpose is
 * defining the Image→Command API boundary) as canonical — cleaner than
 * mixing a real symbolId into the same union position as the literal
 * string "UNKNOWN".
 *
 * "Recognition MUST support rejection. A nearest neighbor alone MUST
 * NOT authorize execution" (SPEC-SCANNER-001) — enforced by
 * recognize.ts applying SIMILARITY_THRESHOLD before ever returning
 * RECOGNIZED.
 */
export type RecognitionResult =
  | {
      readonly status: "RECOGNIZED";
      readonly symbolId: string;
      readonly similarity: number;
    }
  | { readonly status: "UNKNOWN"; readonly similarity?: number };

/**
 * SPEC-SCANNER-001's exact shape (verbatim field names/types) for a
 * successful Done mutation.
 */
export interface TaskCompletionMutation {
  readonly createdAt: string;
  readonly mutationId: string;
  readonly newState: "DONE";
  readonly previousState: TaskState;
  readonly taskId: string;
}

/**
 * dispatch()/undo()'s return shape — CommandResult isn't given a
 * concrete signature anywhere in the corpus (only its name, in
 * `dispatch(symbolId): Promise<CommandResult>`), so this is this
 * package's own disclosed definition, covering every outcome the specs
 * do name explicitly: OK (with the resulting mutation for Done, or
 * none for the two navigation commands), UNKNOWN (REQ-SCAN-006),
 * NO_OPEN_TASK (REQ-SCAN-010), DISABLED (a VisualSymbol row exists but
 * `enabled: false`), and ERROR for anything else (e.g. the
 * AuthorityGate unexpectedly refusing a structurally-legal USER
 * transition).
 */
export type CommandResult =
  | {
      readonly status: "OK";
      readonly symbolId: string;
      readonly command: VisualCommand;
      readonly mutation: TaskCompletionMutation | null;
    }
  | { readonly status: "UNKNOWN" }
  | { readonly status: "NO_OPEN_TASK" }
  | { readonly status: "DISABLED"; readonly symbolId: string }
  | { readonly status: "ERROR"; readonly message: string };
