import { expect, test } from "@playwright/test";

/**
 * M17-T01 — the M14-T01 contact form rewrite (real name/email/message
 * fields wired to a real Resend-backed server action, replacing the
 * stock template's disconnected recruiting-call form — see
 * contact-form.tsx's own header comment). This spec proves the real
 * fields render and accept input, using stable `#id` locators rather
 * than dictionary copy text (which is legitimately allowed to change
 * per-locale without breaking this test).
 *
 * Deliberately does not submit: `contact()`'s real send path needs
 * `RESEND_TOKEN`, which isn't set in every environment this suite might
 * run in, and this spec's job is proving the form itself works, not
 * exercising Resend's delivery pipeline.
 */
test("contact form renders real name/email/message fields", async ({
  page,
}) => {
  const response = await page.goto("/en/contact");
  expect(response?.ok()).toBe(true);

  await page.locator("#name").fill("E2E Test User");
  await page.locator("#email").fill("e2e-test@example.com");
  await page.locator("#message").fill("This is a real E2E-filled message.");

  await expect(page.locator("#name")).toHaveValue("E2E Test User");
  await expect(page.locator("#email")).toHaveValue("e2e-test@example.com");
  await expect(page.locator("#message")).toHaveValue(
    "This is a real E2E-filled message."
  );
});
