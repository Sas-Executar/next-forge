import { describe, expect, test } from "vitest";
import {
  FASE_ATIVACAO_TRANSITIONS,
  type FaseAtivacao,
  faseAtivacaoSchema,
  fonteAutorizadaProviderSchema,
  fonteAutorizadaSchema,
  handoffEnvelopeSchema,
  modeloOperacionalSchema,
  perfilOperacionalSchema,
} from "../src/ativacao";

describe("faseAtivacaoSchema / FASE_ATIVACAO_TRANSITIONS", () => {
  test("accepts every documented fase and rejects an unknown value", () => {
    for (const fase of Object.keys(FASE_ATIVACAO_TRANSITIONS)) {
      expect(faseAtivacaoSchema.safeParse(fase).success).toBe(true);
    }
    expect(faseAtivacaoSchema.safeParse("NAO_E_UMA_FASE").success).toBe(false);
  });

  test("CONCLUIDA is terminal — no outgoing transitions", () => {
    expect(FASE_ATIVACAO_TRANSITIONS.CONCLUIDA).toEqual([]);
  });

  test("the sequence is strictly linear — every fase has at most one legal next step", () => {
    for (const targets of Object.values(FASE_ATIVACAO_TRANSITIONS)) {
      expect(targets.length).toBeLessThanOrEqual(1);
    }
  });

  test("the full chain from ONBOARDING reaches CONCLUIDA in exactly 6 steps, visiting every fase once", () => {
    const visited: FaseAtivacao[] = [];
    let current: FaseAtivacao = "ONBOARDING";
    while (FASE_ATIVACAO_TRANSITIONS[current].length > 0) {
      visited.push(current);
      current = FASE_ATIVACAO_TRANSITIONS[current][0];
    }
    visited.push(current);
    expect(visited).toEqual([
      "ONBOARDING",
      "SCANNER",
      "PRODUCTIVITY",
      "OPERATIONS",
      "MODO_ROTINA",
      "PRIMEIRO_ENTREGAVEL",
      "CONCLUIDA",
    ]);
  });

  test("no transition skips a fase (e.g. ONBOARDING can't jump straight to OPERATIONS)", () => {
    expect(FASE_ATIVACAO_TRANSITIONS.ONBOARDING).not.toContain("OPERATIONS");
    expect(FASE_ATIVACAO_TRANSITIONS.ONBOARDING).not.toContain("PRODUCTIVITY");
  });
});

const baseEnvelope = {
  workspaceId: "ws_1",
  producedAt: new Date().toISOString(),
  producedBy: "AGENT" as const,
  payload: {},
};

describe("handoffEnvelopeSchema", () => {
  test("accepts a legal fase transition", () => {
    const result = handoffEnvelopeSchema.safeParse({
      ...baseEnvelope,
      faseOrigem: "ONBOARDING",
      faseDestino: "SCANNER",
    });
    expect(result.success).toBe(true);
  });

  test("rejects a skipped fase transition", () => {
    const result = handoffEnvelopeSchema.safeParse({
      ...baseEnvelope,
      faseOrigem: "ONBOARDING",
      faseDestino: "OPERATIONS",
    });
    expect(result.success).toBe(false);
  });

  test("rejects a backward transition", () => {
    const result = handoffEnvelopeSchema.safeParse({
      ...baseEnvelope,
      faseOrigem: "SCANNER",
      faseDestino: "ONBOARDING",
    });
    expect(result.success).toBe(false);
  });

  test("rejects a transition out of the terminal fase", () => {
    const result = handoffEnvelopeSchema.safeParse({
      ...baseEnvelope,
      faseOrigem: "CONCLUIDA",
      faseDestino: "ONBOARDING",
    });
    expect(result.success).toBe(false);
  });
});

describe("fonteAutorizadaProviderSchema", () => {
  test("mirrors the 5 literal values of the Prisma IntegrationProvider enum", () => {
    for (const provider of [
      "WHATSAPP",
      "GMAIL",
      "OUTLOOK",
      "GOOGLE_CALENDAR",
      "OUTLOOK_CALENDAR",
    ] as const) {
      expect(fonteAutorizadaProviderSchema.safeParse(provider).success).toBe(
        true
      );
    }
    expect(fonteAutorizadaProviderSchema.safeParse("SLACK").success).toBe(
      false
    );
  });
});

describe("perfilOperacionalSchema", () => {
  test("accepts a minimal valid profile with defaults applied", () => {
    const result = perfilOperacionalSchema.safeParse({
      workspaceId: "ws_1",
      nomeExibicao: "Time de Operações",
      objetivos: ["Reduzir tempo de resposta"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.restricoes).toEqual([]);
      expect(result.data.idsVerbais).toEqual({});
      expect(result.data.autorizacoesSolicitadas).toEqual([]);
    }
  });

  test("rejects an empty objetivos list — at least one goal is required", () => {
    const result = perfilOperacionalSchema.safeParse({
      workspaceId: "ws_1",
      nomeExibicao: "Time de Operações",
      objetivos: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("fonteAutorizadaSchema", () => {
  test("accepts a granted, unrevoked authorization", () => {
    const result = fonteAutorizadaSchema.safeParse({
      provider: "GMAIL",
      workspaceId: "ws_1",
      autorizadoEm: new Date().toISOString(),
      autorizadoPor: "USER",
      escopoLeitura: ["gmail.readonly"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revogadoEm).toBeNull();
    }
  });

  test("rejects an authorization with no read scope granted", () => {
    const result = fonteAutorizadaSchema.safeParse({
      provider: "GMAIL",
      workspaceId: "ws_1",
      autorizadoEm: new Date().toISOString(),
      autorizadoPor: "USER",
      escopoLeitura: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("modeloOperacionalSchema", () => {
  test("accepts a model with up to 3 proposed routines", () => {
    const result = modeloOperacionalSchema.safeParse({
      workspaceId: "ws_1",
      cadencia: "SEMANAL",
      responsaveis: ["ana@example.com"],
      canais: ["whatsapp"],
      rotinasPropostas: ["r1", "r2", "r3"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fusoHorario).toBe("America/Sao_Paulo");
    }
  });

  test("rejects more than 3 proposed routines", () => {
    const result = modeloOperacionalSchema.safeParse({
      workspaceId: "ws_1",
      cadencia: "SEMANAL",
      responsaveis: ["ana@example.com"],
      canais: ["whatsapp"],
      rotinasPropostas: ["r1", "r2", "r3", "r4"],
    });
    expect(result.success).toBe(false);
  });
});
