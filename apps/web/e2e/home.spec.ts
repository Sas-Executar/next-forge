import { expect, test } from "@playwright/test";

/**
 * M17-T01 — institutional web smoke test (M14 surface). Asserts the
 * real M14 copy renders, not placeholder/Lorem Ipsum text — the
 * zero-placeholder rule M14's own commit already enforced, this just
 * proves it stays true against a live render, not only a code review.
 */
test("home page renders the real hero copy", async ({ page }) => {
  const response = await page.goto("/en");
  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", {
      name: "Work one action at a time. Stop switching tasks.",
    })
  ).toBeVisible();
});
