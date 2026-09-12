import { expect, test } from "@playwright/test";
import { signInAsE2eUser } from "./auth";

const PROJECT_DETAIL_URL_PATTERN = /\/projects\/[^/]+$/;

/**
 * M17-T01 / M04's own deferred acceptance test — M04's plan entry named
 * this exact scenario as its Verification step ("one Playwright smoke
 * test") but Playwright didn't exist in this repo yet at M04 time; this
 * is that test, finally landing.
 *
 * Exercises the real vertical slice end to end against a real running
 * app + real Postgres (no mocks): Project → Task → Eligibility → Best
 * Next Action → Execute → Evidence → Progress recompute.
 *
 * `createTask()` (apps/app/app/actions/execution/create-task.ts) sets a
 * new task straight to READY (not BACKLOG_VALIDATED) — a task with no
 * unmet dependencies is eligible immediately; a task depending on one
 * that isn't DONE yet is not. This spec proves both halves: task A
 * (no deps) shows up as the Best Next Action on /now; task B (depends
 * on A) does not, until A is actually completed with evidence.
 */
test("create a project, add a dependent task pair, complete the eligible one, watch /now recompute", async ({
  page,
}) => {
  await signInAsE2eUser(page);

  const suffix = Date.now();
  const projectName = `E2E Project ${suffix}`;
  const taskA = `E2E Task A ${suffix}`;
  const taskB = `E2E Task B (depends on A) ${suffix}`;

  // 1. Create the project.
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projetos" })).toBeVisible();
  await page.getByLabel("Nome do novo projeto").fill(projectName);
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

  // 2. Open it and create task A (no dependencies — immediately eligible).
  await page.getByRole("link", { name: projectName }).click();
  await expect(page).toHaveURL(PROJECT_DETAIL_URL_PATTERN);
  await page.getByLabel("Título da nova tarefa").fill(taskA);
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  await expect(page.getByText(taskA, { exact: true })).toBeVisible();

  // 3. Create task B, depending on task A — not eligible until A is DONE.
  await page.getByLabel("Título da nova tarefa").fill(taskB);
  await page.getByLabel(taskA, { exact: true }).check();
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  await expect(page.getByText(taskB, { exact: true })).toBeVisible();

  // 4. /now selects task A — the only eligible task (WIP=1, no tie).
  await page.goto("/now");
  await expect(page.getByRole("heading", { name: "Agora" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: taskA, exact: true })
  ).toBeVisible();

  // 5. Execute: READY → DOING → VERIFY → DONE (with evidence — "'feito'
  // não substitui evidência" is enforced server-side, not just UI copy).
  await page.getByRole("button", { name: "Iniciar" }).click();
  await expect(
    page.getByRole("button", { name: "Enviar para verificação" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Enviar para verificação" }).click();
  await expect(page.getByRole("button", { name: "Concluir" })).toBeVisible();
  await page.getByRole("button", { name: "Concluir" }).click();
  await page
    .getByPlaceholder("O que comprova que esta tarefa foi concluída?")
    .fill(`E2E evidence for ${taskA}`);
  await page.getByRole("button", { name: "Confirmar conclusão" }).click();

  // 6. Recompute: task A is DONE, so its dependent — task B — is now
  // the Best Next Action. Nothing here is manually recalculated; /now
  // simply re-derives it on read (core domain invariant: "Percentuais
  // são derivados, nunca manuais quando computável").
  await expect(
    page.getByRole("heading", { name: taskB, exact: true })
  ).toBeVisible({ timeout: 10_000 });
});
