import { describe, expect, test } from "vitest";
import {
  canTransitionFaseAtivacao,
  isFaseAtivacaoConcluida,
} from "../src/ativacao-state";

describe("canTransitionFaseAtivacao", () => {
  test.each([
    ["ONBOARDING", "SCANNER"],
    ["SCANNER", "PRODUCTIVITY"],
    ["PRODUCTIVITY", "OPERATIONS"],
    ["OPERATIONS", "MODO_ROTINA"],
    ["MODO_ROTINA", "PRIMEIRO_ENTREGAVEL"],
    ["PRIMEIRO_ENTREGAVEL", "CONCLUIDA"],
  ] as const)("%s -> %s is legal", (from, to) => {
    expect(canTransitionFaseAtivacao(from, to)).toBe(true);
  });

  test.each([
    ["ONBOARDING", "PRODUCTIVITY"], // skips SCANNER
    ["ONBOARDING", "OPERATIONS"],
    ["SCANNER", "ONBOARDING"], // backward
    ["CONCLUIDA", "ONBOARDING"], // terminal, no restart
    ["MODO_ROTINA", "OPERATIONS"], // backward
  ] as const)("%s -> %s is illegal", (from, to) => {
    expect(canTransitionFaseAtivacao(from, to)).toBe(false);
  });
});

describe("isFaseAtivacaoConcluida", () => {
  test("only CONCLUIDA is considered concluded", () => {
    expect(isFaseAtivacaoConcluida("CONCLUIDA")).toBe(true);
    expect(isFaseAtivacaoConcluida("ONBOARDING")).toBe(false);
    expect(isFaseAtivacaoConcluida("MODO_ROTINA")).toBe(false);
  });
});
