import { describe, expect, test } from "vitest";
import {
  computeArpa,
  computeArr,
  computeCac,
  computeCacPaybackMonths,
  computeContribution,
  computeContributionMargin,
  computeGrossRevenueChurn,
  computeLogoChurn,
  ECONOMIC_GUARDRAILS,
  monthlyRecurringRevenueCentavos,
} from "../metrics";

describe("OBS-BIZ-001 §6 canonical formulas — pure", () => {
  test("ARR = MRR × 12", () => {
    expect(computeArr(1000)).toBe(12_000);
  });

  test("ARPA = MRR / paid_accounts, 0 accounts never divides by zero", () => {
    expect(computeArpa(1000, 10)).toBe(100);
    expect(computeArpa(1000, 0)).toBe(0);
  });

  test("CAC = spend / new_paying_accounts, null when no new accounts (not Infinity)", () => {
    expect(computeCac(1000, 10)).toBe(100);
    expect(computeCac(1000, 0)).toBeNull();
  });

  test("CAC payback = CAC / monthly contribution per new account", () => {
    expect(computeCacPaybackMonths(600, 100)).toBe(6);
    expect(computeCacPaybackMonths(600, 0)).toBeNull();
  });

  test("contribution = revenue - tax - fees - AI COGS - channel COGS - infra - other", () => {
    const contribution = computeContribution({
      recognizedRevenue: 1000,
      taxProvision: 60,
      paymentFees: 30,
      aiCogs: 80,
      channelCogs: 20,
      variableInfraCogs: 10,
      otherVariableServiceCogs: 0,
    });
    expect(contribution).toBe(800);
    expect(computeContributionMargin(contribution, 1000)).toBe(0.8);
  });

  test("logo churn / gross revenue churn — null at a zero-account/zero-MRR start rather than dividing by zero", () => {
    expect(computeLogoChurn(2, 20)).toBe(0.1);
    expect(computeLogoChurn(0, 0)).toBeNull();
    expect(computeGrossRevenueChurn(100, 1000)).toBe(0.1);
    expect(computeGrossRevenueChurn(0, 0)).toBeNull();
  });

  test("monthly-normalized MRR: annual plans divide by 12, Trial contributes 0", () => {
    expect(monthlyRecurringRevenueCentavos("SOLO", "monthly")).toBe(4990);
    // 49_900 BRL cents / month * 12... wait this checks annual price / 12
    expect(monthlyRecurringRevenueCentavos("SOLO", "annual")).toBeCloseTo(
      49_900 / 12,
      2
    );
    expect(monthlyRecurringRevenueCentavos("TRIAL", "monthly")).toBe(0);
  });

  test("ECONOMIC_GUARDRAILS match OBS-BIZ-001 §7 / OBS-006 §4 verbatim thresholds", () => {
    expect(ECONOMIC_GUARDRAILS.SOLO.aiCogsToRevenueMax).toBe(0.08);
    expect(ECONOMIC_GUARDRAILS.PRO.aiCogsToRevenueMax).toBe(0.1);
    expect(ECONOMIC_GUARDRAILS.BUSINESS.aiCogsToRevenueMax).toBe(0.12);
    expect(ECONOMIC_GUARDRAILS.SOLO.contributionMarginMin).toBe(0.7);
    expect(ECONOMIC_GUARDRAILS.BUSINESS.cacPaybackMonthsMax).toBe(9);
  });
});
