import { describe, expect, test } from "vitest";
import { formatOrchestratorOutputText } from "../src/format";
import type { OrchestratorOutput } from "../src/output-schema";

const base: OrchestratorOutput = {
  status: "OK",
  route: { module: "AGENTE-Copiloto-007", action: "agora" },
  read_scope: ["Task"],
  write_policy: {
    allowed: false,
    targets: [],
    requires_human_confirmation: false,
  },
  state_transition: null,
  derived_progress_pct: null,
  ui: {
    headline: "Em execução",
    agora: "Escrever testes",
    tempo: null,
    conclui_quando: null,
    evidencia: null,
    proxima_acao: "Continue.",
    mermaid: null,
  },
};

describe("formatOrchestratorOutputText (SKILL.md fixed emit block)", () => {
  test("always includes STATUS/headline, AGORA and PRÓXIMA", () => {
    const text = formatOrchestratorOutputText(base);
    expect(text).toContain("[OK] Em execução");
    expect(text).toContain("AGORA: Escrever testes");
    expect(text).toContain("PRÓXIMA: Continue.");
  });

  test("omits TEMPO/CONCLUI QUANDO/EVIDÊNCIA lines when null", () => {
    const text = formatOrchestratorOutputText(base);
    expect(text).not.toContain("TEMPO:");
    expect(text).not.toContain("CONCLUI QUANDO:");
    expect(text).not.toContain("EVIDÊNCIA:");
  });

  test("includes them when present", () => {
    const text = formatOrchestratorOutputText({
      ...base,
      ui: {
        ...base.ui,
        tempo: "30min",
        conclui_quando: "DoD ok",
        evidencia: "print",
      },
    });
    expect(text).toContain("TEMPO: 30min");
    expect(text).toContain("CONCLUI QUANDO: DoD ok");
    expect(text).toContain("EVIDÊNCIA: print");
  });

  test("appends warnings and a fenced mermaid block when present", () => {
    const text = formatOrchestratorOutputText({
      ...base,
      warnings: ["algo incompleto"],
      ui: { ...base.ui, mermaid: "graph TD\n  A --> B" },
    });
    expect(text).toContain("⚠️ algo incompleto");
    expect(text).toContain("```mermaid");
    expect(text).toContain("graph TD");
  });
});
