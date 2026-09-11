import { describe, expect, test } from "vitest";
import { advanceFaseAtivacao } from "../src/ativacao-orchestrator";

const baseEnvelope = {
  workspaceId: "ws_1",
  producedAt: new Date().toISOString(),
  producedBy: "AGENT" as const,
};

const validBacklogPayload = {
  workspaceId: "ws_1",
  itens: [{ titulo: "Item 1", prioridade: "ALTA" as const }],
  modoDeTrabalho: "Kanban pessoal",
  capacidade: "4h/dia",
};

describe("advanceFaseAtivacao — the Fase 5 aceite: Operations não inicia sem saída válida de Productivity", () => {
  test("rejects a PRODUCTIVITY -> OPERATIONS handoff with an invalid backlog payload", () => {
    const result = advanceFaseAtivacao({
      ...baseEnvelope,
      faseOrigem: "PRODUCTIVITY",
      faseDestino: "OPERATIONS",
      payload: { itens: [] }, // missing required fields, empty itens
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("PRODUCTIVITY");
    }
  });

  test("accepts a PRODUCTIVITY -> OPERATIONS handoff with a valid backlog payload", () => {
    const result = advanceFaseAtivacao({
      ...baseEnvelope,
      faseOrigem: "PRODUCTIVITY",
      faseDestino: "OPERATIONS",
      payload: validBacklogPayload,
    });
    expect(result.ok).toBe(true);
  });

  test("rejects a structurally illegal transition even with a valid-shaped payload", () => {
    const result = advanceFaseAtivacao({
      ...baseEnvelope,
      faseOrigem: "ONBOARDING",
      faseDestino: "OPERATIONS", // skips SCANNER and PRODUCTIVITY
      payload: validBacklogPayload,
    });
    expect(result.ok).toBe(false);
  });

  test("rejects a PRIMEIRO_ENTREGAVEL -> CONCLUIDA handoff with an incomplete deliverable", () => {
    const result = advanceFaseAtivacao({
      ...baseEnvelope,
      faseOrigem: "PRIMEIRO_ENTREGAVEL",
      faseDestino: "CONCLUIDA",
      payload: { workspaceId: "ws_1" }, // missing every other required field
    });
    expect(result.ok).toBe(false);
  });

  test("CONCLUIDA has no outgoing schema check — but the transition itself is still structurally rejected (terminal)", () => {
    const result = advanceFaseAtivacao({
      ...baseEnvelope,
      faseOrigem: "CONCLUIDA",
      faseDestino: "ONBOARDING",
      payload: {},
    });
    expect(result.ok).toBe(false);
  });
});
