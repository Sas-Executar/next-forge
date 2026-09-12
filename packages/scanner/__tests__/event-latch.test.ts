import { describe, expect, it } from "vitest";
import {
  INITIAL_LATCH_STATUS,
  type LatchStatus,
  tickLatch,
} from "../src/event-latch";

const run = (ticks: readonly (string | null)[]) => {
  let status: LatchStatus = INITIAL_LATCH_STATUS;
  const dispatches: boolean[] = [];
  for (const tick of ticks) {
    const result = tickLatch(status, tick);
    status = result.next;
    dispatches.push(result.shouldDispatch);
  }
  return { finalStatus: status, dispatches };
};

describe("tickLatch", () => {
  it("one ENTER->FIRED sequence produces exactly one dispatch", () => {
    const { dispatches } = run([
      "SYM-DONE-001",
      "SYM-DONE-001",
      "SYM-DONE-001",
    ]);
    expect(dispatches).toEqual([false, true, false]);
    expect(dispatches.filter(Boolean)).toHaveLength(1);
  });

  it("PRESENT never repeats a dispatch while the symbol stays visible", () => {
    const ticks = new Array(10).fill("SYM-DONE-001");
    const { dispatches, finalStatus } = run(ticks);
    expect(dispatches.filter(Boolean)).toHaveLength(1);
    expect(finalStatus.state).toBe("PRESENT");
  });

  it("exit then re-entry produces a new dispatch", () => {
    const { dispatches } = run([
      "SYM-DONE-001",
      "SYM-DONE-001", // fires here
      null, // exit -> ABSENT
      "SYM-DONE-001", // re-enter
      "SYM-DONE-001", // fires again
    ]);
    expect(dispatches).toEqual([false, true, false, false, true]);
  });

  it("never seeing a symbol produces no dispatch", () => {
    const { dispatches, finalStatus } = run([null, null, null]);
    expect(dispatches.every((d) => !d)).toBe(true);
    expect(finalStatus).toEqual(INITIAL_LATCH_STATUS);
  });

  it("switching directly from one symbol to a different one restarts the debounce (no dispatch on the switch tick)", () => {
    const { dispatches } = run([
      "SYM-DONE-001",
      "SYM-DONE-001", // fires
      "SYM-CHAT-001", // different symbol — restarts as ENTER
      "SYM-CHAT-001", // fires
    ]);
    expect(dispatches).toEqual([false, true, false, true]);
  });

  it("a single-frame flicker (present, absent, present) does not count as PRESENT — each re-entry needs its own ENTER->FIRED", () => {
    const { dispatches } = run([
      "SYM-DONE-001", // ENTER
      null, // ABSENT (never reached FIRED)
      "SYM-DONE-001", // ENTER again
      "SYM-DONE-001", // FIRED — dispatch
    ]);
    expect(dispatches).toEqual([false, false, false, true]);
  });
});
