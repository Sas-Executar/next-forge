import { describe, expect, test } from "vitest";
import {
  ROTINA_NORMATIVA_TRANSITIONS,
  rotinaNormativaStatusSchema,
  rotinaPropostaSchema,
  rotinasPropostasLoteSchema,
} from "../src/modo-rotina";

describe("rotinaNormativaStatusSchema / ROTINA_NORMATIVA_TRANSITIONS", () => {
  test("accepts every documented status and rejects an unknown value", () => {
    for (const status of Object.keys(ROTINA_NORMATIVA_TRANSITIONS)) {
      expect(rotinaNormativaStatusSchema.safeParse(status).success).toBe(true);
    }
    expect(rotinaNormativaStatusSchema.safeParse("ARQUIVADO").success).toBe(
      false
    );
  });

  test("ATIVO and PAUSADO toggle between each other", () => {
    expect(ROTINA_NORMATIVA_TRANSITIONS.ATIVO).toContain("PAUSADO");
    expect(ROTINA_NORMATIVA_TRANSITIONS.PAUSADO).toContain("ATIVO");
  });

  test("ATIVO and REVISAO toggle between each other", () => {
    expect(ROTINA_NORMATIVA_TRANSITIONS.ATIVO).toContain("REVISAO");
    expect(ROTINA_NORMATIVA_TRANSITIONS.REVISAO).toContain("ATIVO");
  });

  test("PROPOSTO can only reach CONFIRMADO, never ATIVO directly", () => {
    expect(ROTINA_NORMATIVA_TRANSITIONS.PROPOSTO).toEqual(["CONFIRMADO"]);
  });

  test("no status is terminal — every one of the 5 has at least one outgoing transition", () => {
    for (const targets of Object.values(ROTINA_NORMATIVA_TRANSITIONS)) {
      expect(targets.length).toBeGreaterThan(0);
    }
  });
});

const validProposta = {
  titulo: "Lembrete de status semanal",
  descricaoBeneficio: "Reduz esquecimento de reportar status ao time",
  cadencia: "SEMANAL" as const,
  dadosNecessarios: ["lista de tarefas em DOING"],
  classificacaoRisco: "BAIXO" as const,
  reversivel: true,
  descricaoReversibilidade: "Pausar a rotina a qualquer momento",
  responsavelRef: "user_123",
  canalEntrega: "whatsapp",
};

describe("rotinaPropostaSchema", () => {
  test("accepts a proposal with all 10 required fields, defaults applied", () => {
    const result = rotinaPropostaSchema.safeParse(validProposta);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fusoHorario).toBe("America/Sao_Paulo");
      expect(result.data.fontesConsultadas).toEqual([]);
    }
  });

  test("rejects a proposal missing descricaoReversibilidade (no reversibility description)", () => {
    const { descricaoReversibilidade, ...incomplete } = validProposta;
    expect(rotinaPropostaSchema.safeParse(incomplete).success).toBe(false);
  });

  test("rejects a proposal with no dadosNecessarios", () => {
    const result = rotinaPropostaSchema.safeParse({
      ...validProposta,
      dadosNecessarios: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("rotinasPropostasLoteSchema — exatamente 3 automações", () => {
  test("accepts exactly 3 proposals", () => {
    const result = rotinasPropostasLoteSchema.safeParse([
      validProposta,
      validProposta,
      validProposta,
    ]);
    expect(result.success).toBe(true);
  });

  test("rejects 2 proposals", () => {
    const result = rotinasPropostasLoteSchema.safeParse([
      validProposta,
      validProposta,
    ]);
    expect(result.success).toBe(false);
  });

  test("rejects 4 proposals", () => {
    const result = rotinasPropostasLoteSchema.safeParse([
      validProposta,
      validProposta,
      validProposta,
      validProposta,
    ]);
    expect(result.success).toBe(false);
  });
});
