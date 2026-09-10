import { describe, expect, test } from "vitest";
import {
  entitlementsForPlan,
  hasEntitlement,
  PLAN_ENTITLEMENTS,
} from "../src/entitlements";
import { PLAN_DEFINITIONS, SELF_SERVE_PLANS } from "../src/plans";

describe("PLAN_ENTITLEMENTS (M13-T02, PRICING-001 §3-5)", () => {
  test("core execution surface is true on every plan, Trial included — PRICING-001 §3's own rule", () => {
    for (const plan of Object.keys(
      PLAN_ENTITLEMENTS
    ) as (keyof typeof PLAN_ENTITLEMENTS)[]) {
      expect(hasEntitlement(plan, "coreExecutionSurface")).toBe(true);
    }
  });

  test("Routines/automations/MCP are Pro+ only, not Solo — PRICING-001 §4's own additions list", () => {
    expect(hasEntitlement("SOLO", "routines")).toBe(false);
    expect(hasEntitlement("SOLO", "mcp")).toBe(false);
    expect(hasEntitlement("PRO", "routines")).toBe(true);
    expect(hasEntitlement("PRO", "mcp")).toBe(true);
    expect(hasEntitlement("BUSINESS", "routines")).toBe(true);
  });

  test("organizational governance is Business+ only — PRICING-001 §5", () => {
    expect(hasEntitlement("PRO", "organizationalGovernance")).toBe(false);
    expect(hasEntitlement("BUSINESS", "organizationalGovernance")).toBe(true);
    expect(hasEntitlement("ENTERPRISE", "organizationalGovernance")).toBe(true);
  });

  test("seatsIncluded: 1 executor for Trial/Solo/Pro, 5 for Business, null (contract) for Enterprise", () => {
    expect(entitlementsForPlan("TRIAL").seatsIncluded).toBe(1);
    expect(entitlementsForPlan("SOLO").seatsIncluded).toBe(1);
    expect(entitlementsForPlan("PRO").seatsIncluded).toBe(1);
    expect(entitlementsForPlan("BUSINESS").seatsIncluded).toBe(5);
    expect(entitlementsForPlan("ENTERPRISE").seatsIncluded).toBeNull();
  });
});

describe("PLAN_DEFINITIONS (M13-T01, PRICING-001 §2)", () => {
  test("Trial and Enterprise have no self-serve Stripe price — never fabricated", () => {
    expect(PLAN_DEFINITIONS.TRIAL.monthlyPriceCentavos).toBeNull();
    expect(PLAN_DEFINITIONS.ENTERPRISE.monthlyPriceCentavos).toBeNull();
    expect(SELF_SERVE_PLANS).not.toContain("TRIAL");
    expect(SELF_SERVE_PLANS).not.toContain("ENTERPRISE");
  });

  test("Solo/Pro/Business monthly prices match PRICING-001 §2's table verbatim (in centavos)", () => {
    expect(PLAN_DEFINITIONS.SOLO.monthlyPriceCentavos).toBe(4990);
    expect(PLAN_DEFINITIONS.PRO.monthlyPriceCentavos).toBe(8990);
    expect(PLAN_DEFINITIONS.BUSINESS.monthlyPriceCentavos).toBe(49_900);
  });
});
