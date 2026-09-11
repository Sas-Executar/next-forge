import { describe, expect, test } from "vitest";
import { canTransitionRotinaNormativa } from "../src/modo-rotina-state";

describe("canTransitionRotinaNormativa", () => {
  test.each([
    ["PROPOSTO", "CONFIRMADO"],
    ["CONFIRMADO", "ATIVO"],
    ["ATIVO", "PAUSADO"],
    ["ATIVO", "REVISAO"],
    ["PAUSADO", "ATIVO"],
    ["REVISAO", "ATIVO"],
  ] as const)("%s -> %s is legal", (from, to) => {
    expect(canTransitionRotinaNormativa(from, to)).toBe(true);
  });

  test.each([
    ["PROPOSTO", "ATIVO"], // must go through CONFIRMADO
    ["CONFIRMADO", "PAUSADO"], // must go through ATIVO
    ["PAUSADO", "REVISAO"], // must go through ATIVO
    ["REVISAO", "PAUSADO"], // must go through ATIVO
  ] as const)("%s -> %s is illegal", (from, to) => {
    expect(canTransitionRotinaNormativa(from, to)).toBe(false);
  });
});
