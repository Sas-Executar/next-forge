import { describe, expect, test } from "vitest";
import { actorTypeSchema } from "../src/actor";
import { behaviorAuthoritySchema } from "../src/authority";
import { authorityDecisionSchema } from "../src/authority-decision";
import {
  subscriptionPlanSchema,
  subscriptionStatusSchema,
} from "../src/billing";
import { evidenceGradeSchema } from "../src/evidence";
import {
  visualCommandSchema,
  visualSymbolSemanticSchema,
} from "../src/scanner";

/**
 * M17-T02 — the remaining schemas/src enums (D9 single-definition-point
 * contracts every other package mirrors or imports by hand) had no
 * coverage proving their literal value sets are what every consumer
 * (schema.prisma's enums, packages/domain, packages/billing,
 * packages/scanner) actually expects. One round-trip table per schema:
 * every documented literal parses, and an unrelated string is rejected —
 * catches a typo'd literal or an accidental value removal immediately,
 * without re-testing zod itself.
 */
const roundTrips = <T extends string>(
  schema: { safeParse: (value: unknown) => { success: boolean } },
  values: readonly T[]
) => {
  for (const value of values) {
    // biome-ignore lint/suspicious/noMisplacedAssertion: helper called only from inside test() bodies below
    expect(
      schema.safeParse(value).success,
      `expected "${value}" to parse`
    ).toBe(true);
  }
  // biome-ignore lint/suspicious/noMisplacedAssertion: helper called only from inside test() bodies below
  expect(schema.safeParse("NOT_A_REAL_VALUE").success).toBe(false);
};

describe("actorTypeSchema", () => {
  test("accepts USER, AGENT, SYSTEM and rejects anything else", () => {
    roundTrips(actorTypeSchema, ["USER", "AGENT", "SYSTEM"] as const);
  });
});

describe("authorityDecisionSchema", () => {
  test("accepts ALLOW, BLOCK, HUMAN_REQUIRED and rejects anything else", () => {
    roundTrips(authorityDecisionSchema, [
      "ALLOW",
      "BLOCK",
      "HUMAN_REQUIRED",
    ] as const);
  });
});

describe("behaviorAuthoritySchema", () => {
  test("accepts all four SPEC-classified behaviors and rejects anything else", () => {
    roundTrips(behaviorAuthoritySchema, [
      "DETERMINISTICO",
      "INTERPRETATIVO",
      "EXIGE_HUMANO",
      "NAO_DETERMINADO",
    ] as const);
  });
});

describe("evidenceGradeSchema", () => {
  test("accepts all five mapa-os-contract grades and rejects anything else", () => {
    roundTrips(evidenceGradeSchema, [
      "A_OBSERVADO",
      "B_PRIMARIO",
      "C_PUBLICADO",
      "D_INTERNO",
      "E_INFERIDO",
    ] as const);
  });

  test("rejects the AGENTS.md English names — those are documentation only, not separate accepted values", () => {
    expect(evidenceGradeSchema.safeParse("OBSERVED").success).toBe(false);
  });
});

describe("subscriptionPlanSchema / subscriptionStatusSchema", () => {
  test("plan accepts all 5 PRICING-001 plan identifiers and rejects anything else", () => {
    roundTrips(subscriptionPlanSchema, [
      "TRIAL",
      "SOLO",
      "PRO",
      "BUSINESS",
      "ENTERPRISE",
    ] as const);
  });

  test("status accepts all 4 collapsed Stripe states and rejects anything else", () => {
    roundTrips(subscriptionStatusSchema, [
      "TRIALING",
      "ACTIVE",
      "PAST_DUE",
      "CANCELED",
    ] as const);
  });
});

describe("visualSymbolSemanticSchema / visualCommandSchema", () => {
  test("semantic accepts the 3 V1 symbols and rejects anything else", () => {
    roundTrips(visualSymbolSemanticSchema, [
      "CHAT",
      "SELECTOR",
      "DONE",
    ] as const);
  });

  test("command accepts the 3 V1 commands and rejects anything else", () => {
    roundTrips(visualCommandSchema, [
      "OPEN_CHAT",
      "OPEN_SELECTOR",
      "COMPLETE_LATEST_OPEN_TASK",
    ] as const);
  });
});
