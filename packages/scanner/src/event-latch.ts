/**
 * ScanEventLatch (SPEC-SCANNER-001's pipeline stage of the same name).
 * Pure state machine implementing the spec's exact 4-state cycle —
 * `ABSENT → ENTER → FIRED → PRESENT → (ABSENT)` — edge-triggered per
 * ADR-SCANNER-001: "Frames repetidos em PRESENT MUST NOT disparar
 * novamente."
 *
 * Dispatch fires on exactly one transition: ENTER → FIRED, i.e. the
 * second consecutive tick a given symbol is recognized (the first
 * tick moves ABSENT → ENTER without dispatching). This is a one-frame
 * debounce, not stated explicitly by name anywhere in the corpus, but
 * it's the only reading of the diagram that gives ENTER and FIRED
 * distinct meaning — if ENTER itself dispatched, FIRED would be a
 * redundant fifth state with nothing left to do. Disclosed
 * interpretation, consistent with the spec's own required test list
 * ("um ENTER produz um comando" / "PRESENT não repete comando" /
 * "saída/reentrada pode produzir novo evento" — all three hold under
 * this reading, see this package's event-latch.test.ts).
 */
export type LatchState = "ABSENT" | "ENTER" | "FIRED" | "PRESENT";

export interface LatchStatus {
  readonly state: LatchState;
  readonly symbolId: string | null;
}

export interface LatchTickResult {
  readonly next: LatchStatus;
  readonly shouldDispatch: boolean;
}

export const INITIAL_LATCH_STATUS: LatchStatus = {
  state: "ABSENT",
  symbolId: null,
};

/**
 * One tick of the latch, given whatever SymbolMatcher recognized this
 * frame (`null` for UNKNOWN/nothing in the ROI). Pure — no timers, no
 * I/O — so apps/mobile's real per-frame camera loop and this
 * package's tests both drive the exact same function.
 */
export const tickLatch = (
  current: LatchStatus,
  detectedSymbolId: string | null
): LatchTickResult => {
  if (detectedSymbolId === null) {
    return { next: INITIAL_LATCH_STATUS, shouldDispatch: false };
  }

  if (detectedSymbolId !== current.symbolId) {
    // A new symbol just appeared — whether from ABSENT or replacing a
    // different symbol that was PRESENT a moment ago — always (re)starts
    // the debounce, never dispatches on this tick.
    return {
      next: { state: "ENTER", symbolId: detectedSymbolId },
      shouldDispatch: false,
    };
  }

  // Same symbol as last tick — advance the debounce/settle sequence.
  switch (current.state) {
    case "ENTER":
      return {
        next: { state: "FIRED", symbolId: detectedSymbolId },
        shouldDispatch: true,
      };
    case "FIRED":
    case "PRESENT":
      return {
        next: { state: "PRESENT", symbolId: detectedSymbolId },
        shouldDispatch: false,
      };
    case "ABSENT":
      // Defensive fallback (shouldn't occur — a symbolId match against
      // ABSENT's null symbolId is caught by the branch above) — treat
      // as a fresh entry rather than throwing on an unreachable case.
      return {
        next: { state: "ENTER", symbolId: detectedSymbolId },
        shouldDispatch: false,
      };
    default: {
      const exhaustive: never = current.state;
      throw new Error(`Unhandled latch state: ${exhaustive as string}`);
    }
  }
};
