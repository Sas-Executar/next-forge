import { describe, expect, test } from "vitest";
import {
  statusReportSchema,
  validateStatusReport,
} from "../src/status-report-schema";

const validMinimal = {
  report_id: "r1",
  run_id: null,
  project_id: null,
  generated_at: new Date().toISOString(),
  status: "OK",
  progress: { project_percent: 50, cycle_current: null, today_delta: 2 },
  triptych: { previous: null, current: null, next: null },
  now: null,
  properties: {
    context: "1 tarefa",
    problem: "Nenhum bloqueio identificado.",
    process: "WIP=1",
    progress: "50% (1/2)",
    next_1: null,
    next_2: null,
    next_3: null,
    risk: "Nenhum risco identificado.",
    prevention: "Nenhuma ação preventiva necessária.",
    delivery: "Nenhuma entrega registrada ainda.",
  },
  evidence_refs: [],
  gaps: [],
};

describe("statusReportSchema (M07-T01, SPEC-ROUTINES-001 §4)", () => {
  test("accepts a minimal valid report", () => {
    expect(() => validateStatusReport(validMinimal)).not.toThrow();
  });

  test("rejects an invalid status", () => {
    expect(() =>
      validateStatusReport({ ...validMinimal, status: "NAO_EXISTE" })
    ).toThrow();
  });

  test("rejects a project_percent outside [0, 100]", () => {
    expect(() =>
      validateStatusReport({
        ...validMinimal,
        progress: { ...validMinimal.progress, project_percent: 150 },
      })
    ).toThrow();
  });

  test("the schema object itself matches the shape parse() uses", () => {
    expect(statusReportSchema.safeParse(validMinimal).success).toBe(true);
  });
});
