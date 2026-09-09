import { describe, expect, test } from "vitest";
import {
  orchestratorOutputSchema,
  validateOrchestratorOutput,
} from "../src/output-schema";

const validMinimal = {
  status: "OK",
  route: { module: "AGENTE-Copiloto-007", action: "agora" },
  read_scope: ["Task"],
  write_policy: { allowed: false, targets: [] },
  ui: {
    headline: "Em execução",
    agora: "Escrever testes",
    proxima_acao: "Continue.",
  },
};

describe("orchestratorOutputSchema (M06-T02)", () => {
  test("accepts a minimal valid output and defaults requires_human_confirmation", () => {
    const result = validateOrchestratorOutput(validMinimal);
    expect(result.write_policy.requires_human_confirmation).toBe(false);
  });

  test("accepts an explicit null state_transition", () => {
    expect(() =>
      validateOrchestratorOutput({ ...validMinimal, state_transition: null })
    ).not.toThrow();
  });

  test("rejects an invalid status enum value", () => {
    expect(() =>
      validateOrchestratorOutput({ ...validMinimal, status: "SUCESSO" })
    ).toThrow();
  });

  test("rejects an unknown route.module", () => {
    expect(() =>
      validateOrchestratorOutput({
        ...validMinimal,
        route: { module: "NOT-A-REAL-MODULE", action: "agora" },
      })
    ).toThrow();
  });

  test("rejects additional top-level properties (additionalProperties: false)", () => {
    expect(() =>
      validateOrchestratorOutput({ ...validMinimal, extra_field: "nope" })
    ).toThrow();
  });

  test("rejects a derived_progress_pct outside [0, 100]", () => {
    expect(() =>
      validateOrchestratorOutput({ ...validMinimal, derived_progress_pct: 150 })
    ).toThrow();
  });

  test("requires ui.headline, ui.agora, ui.proxima_acao", () => {
    const { headline: _headline, ...uiWithoutHeadline } = validMinimal.ui;
    expect(() =>
      validateOrchestratorOutput({
        ...validMinimal,
        ui: uiWithoutHeadline,
      })
    ).toThrow();
  });

  test("the schema object itself matches the shape parse() uses", () => {
    expect(orchestratorOutputSchema.safeParse(validMinimal).success).toBe(true);
  });
});
