import { describe, expect, test } from "vitest";
import { PrismaFitError, populatePrismaA4 } from "../src/populate";
import type { PrismaA4Payload } from "../src/types";

const PLACEHOLDER_PATTERN = /\{\{[A-Z0-9_]+\}\}/;

const kpi = (n: number) => ({
  label: `KPI ${n}`,
  value: `${n}0%`,
  caption: `caption ${n}`,
});
const day = (n: number) => ({
  number: String(n).padStart(2, "0"),
  weekday: "seg",
  date: "01/01",
  title: `Dia ${n}`,
  focus: "foco",
  track1: "t1",
  track2: "t2",
});
const item = (n: number) => ({
  title: `Item ${n}`,
  description: "desc",
  status: "DONE",
});

const validPayload: PrismaA4Payload = {
  doc: { topEyebrow: "EXECUTAR", periodShort: "01–07/01", trace: "trace-1" },
  epic: {
    title: "Epic de teste",
    number: "EP-01",
    state: "EM ANDAMENTO",
    progressPct: "50%",
    eyebrow: "Prisma 7D",
    description: "Descrição real da epic.",
    intentLabel: "Intenção",
    intentTitle: "Foco da semana",
    intentText: "Terminar o módulo X.",
    kpis: [kpi(1), kpi(2), kpi(3), kpi(4)],
  },
  calendar: {
    title: "Semana operacional",
    eyebrow: "Prisma 7D",
    weekId: "2026-W02",
    period: "01/01 – 07/01",
    days: [
      day(1),
      day(2),
      day(3),
      day(4),
      day(5),
      day(6),
      { ...day(7), track3: "t3" },
    ],
  },
  result: {
    title: "Resultados",
    eyebrow: "Prisma 7D",
    meta: "2 concluídas",
    heroTag: "Destaque",
    heroTitle: "Entrega principal",
    heroDescription: "Descrição real do destaque.",
    heroStateLabel: "Estado",
    heroStateValue: "DONE",
    items: [item(1), item(2), item(3), item(4)],
    nextLabel: "Próximo",
    nextValue: "Próxima ação real",
  },
};

describe("populatePrismaA4 (M07-T03)", () => {
  test("populates every one of the template's 100 placeholders with no literal {{...}} left", () => {
    const html = populatePrismaA4(validPayload);
    expect(html).not.toMatch(PLACEHOLDER_PATTERN);
    expect(html).toContain("Epic de teste");
    expect(html).toContain("Terminar o módulo X.");
    expect(html).toContain("t3"); // day 7's track3
  });

  test("throws PrismaFitError (not a silent truncation) when a value is missing", () => {
    const invalid: PrismaA4Payload = {
      ...validPayload,
      epic: { ...validPayload.epic, title: "" },
    };
    expect(() => populatePrismaA4(invalid)).toThrow(PrismaFitError);
  });

  test("throws PrismaFitError when a value exceeds its inferred length limit", () => {
    const invalid: PrismaA4Payload = {
      ...validPayload,
      epic: { ...validPayload.epic, title: "X".repeat(500) },
    };
    try {
      populatePrismaA4(invalid);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PrismaFitError);
      expect(
        (error as InstanceType<typeof PrismaFitError>).issues.join()
      ).toContain("EPIC_TITLE");
    }
  });

  test("day 1-6 track3 is never emitted (not a real template placeholder)", () => {
    const html = populatePrismaA4(validPayload);
    expect(html).not.toContain("CALENDAR_DAY_01_TRACK_03");
  });
});
