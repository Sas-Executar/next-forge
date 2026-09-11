import { describe, expect, test } from "vitest";
import {
  backlogInicialSchema,
  primeiroEntregavelSchema,
} from "../src/ativacao";

describe("backlogInicialSchema", () => {
  test("accepts a minimal valid backlog", () => {
    const result = backlogInicialSchema.safeParse({
      workspaceId: "ws_1",
      itens: [{ titulo: "Responder clientes pendentes", prioridade: "ALTA" }],
      modoDeTrabalho: "Kanban pessoal",
      capacidade: "4h/dia",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an empty itens list", () => {
    const result = backlogInicialSchema.safeParse({
      workspaceId: "ws_1",
      itens: [],
      modoDeTrabalho: "Kanban pessoal",
      capacidade: "4h/dia",
    });
    expect(result.success).toBe(false);
  });
});

const validPerfil = {
  workspaceId: "ws_1",
  nomeExibicao: "Time de Operações",
  objetivos: ["Reduzir tempo de resposta"],
};

const validBacklog = {
  workspaceId: "ws_1",
  itens: [{ titulo: "Item 1", prioridade: "ALTA" as const }],
  modoDeTrabalho: "Kanban pessoal",
  capacidade: "4h/dia",
};

const validModelo = {
  workspaceId: "ws_1",
  cadencia: "SEMANAL" as const,
  responsaveis: ["ana@example.com"],
  canais: ["whatsapp"],
  rotinasPropostas: ["r1", "r2", "r3"],
};

describe("primeiroEntregavelSchema", () => {
  test("accepts a fully consolidated deliverable", () => {
    const result = primeiroEntregavelSchema.safeParse({
      workspaceId: "ws_1",
      perfilOperacional: validPerfil,
      fontesAutorizadas: [],
      backlogInicial: validBacklog,
      modeloOperacional: validModelo,
      rotinasConfirmadas: ["r1", "r2", "r3"],
      proximosPassos: ["Confirmar primeira rotina"],
      geradoEm: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  test("rejects a deliverable with fewer than 3 rotinasConfirmadas", () => {
    const result = primeiroEntregavelSchema.safeParse({
      workspaceId: "ws_1",
      perfilOperacional: validPerfil,
      fontesAutorizadas: [],
      backlogInicial: validBacklog,
      modeloOperacional: validModelo,
      rotinasConfirmadas: ["r1", "r2"],
      proximosPassos: ["Confirmar primeira rotina"],
      geradoEm: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  test("rejects a deliverable with no proximosPassos", () => {
    const result = primeiroEntregavelSchema.safeParse({
      workspaceId: "ws_1",
      perfilOperacional: validPerfil,
      fontesAutorizadas: [],
      backlogInicial: validBacklog,
      modeloOperacional: validModelo,
      rotinasConfirmadas: ["r1", "r2", "r3"],
      proximosPassos: [],
      geradoEm: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
