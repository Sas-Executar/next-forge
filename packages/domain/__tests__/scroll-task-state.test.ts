import { describe, expect, test } from "vitest";
import {
  canTransitionScrollTask,
  onTimerElapsed,
} from "../src/scroll-task-state";

describe("canTransitionScrollTask", () => {
  test.each([
    ["idle", "running"],
    ["running", "expanded"],
    ["running", "completed"],
    ["running", "deferred"],
    ["running", "timer_elapsed"],
    ["expanded", "running"],
    ["expanded", "completed"],
    ["expanded", "deferred"],
    ["timer_elapsed", "running"],
    ["timer_elapsed", "completed"],
    ["timer_elapsed", "deferred"],
  ] as const)("%s -> %s is legal", (from, to) => {
    expect(canTransitionScrollTask(from, to)).toBe(true);
  });

  test.each([
    ["idle", "completed"], // must go through running
    ["idle", "expanded"],
    ["completed", "running"], // terminal
    ["deferred", "running"], // terminal
    ["expanded", "timer_elapsed"], // timer only fires from running
  ] as const)("%s -> %s is illegal", (from, to) => {
    expect(canTransitionScrollTask(from, to)).toBe(false);
  });
});

describe("onTimerElapsed — the 'never auto-completes' guard", () => {
  test("from running, the timer can only ever produce timer_elapsed, never completed", () => {
    expect(onTimerElapsed("running")).toBe("timer_elapsed");
  });

  test("from any state where timer_elapsed isn't a legal target, the timer produces null (no-op), never a forced completion", () => {
    expect(onTimerElapsed("idle")).toBeNull();
    expect(onTimerElapsed("completed")).toBeNull();
    expect(onTimerElapsed("deferred")).toBeNull();
  });
});
