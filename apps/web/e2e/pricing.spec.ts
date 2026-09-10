import { expect, test } from "@playwright/test";
import { PLAN_DEFINITIONS, SELF_SERVE_PLANS } from "@repo/billing/plans";

/**
 * M17-T01 — pricing page renders the real plan data from
 * `@repo/billing/plans` (M14-T03/M13), not placeholder JSX. Importing
 * the same constant the page itself reads means this test can't drift
 * out of sync with a plan rename — if `PLAN_DEFINITIONS` changes, this
 * spec automatically asserts on the new names.
 */
test("pricing page lists every self-serve plan by its real name", async ({
  page,
}) => {
  const response = await page.goto("/en/pricing");
  expect(response?.ok()).toBe(true);

  for (const plan of SELF_SERVE_PLANS) {
    await expect(
      page.getByText(PLAN_DEFINITIONS[plan].name, { exact: true }).first()
    ).toBeVisible();
  }
});
