import type { ScrollTaskUnit } from "@repo/schemas";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { ScrollTaskView } from "../app/(authenticated)/scroll/scroll-task-view";

const UNITS: readonly ScrollTaskUnit[] = [
  { refId: "task_1", scope: "task", titulo: "Responder cliente" },
  { refId: "task_2", scope: "task", titulo: "Revisar contrato" },
];

const DETALHE_TASK_1_PATTERN = /Escopo: task · refId: task_1/;
const EMPTY_STATE_PATTERN = /Nada elegível agora/;

// Vitest globals aren't enabled in apps/app/vitest.config.ts, so
// @testing-library/react can't auto-detect `afterEach` to register its
// usual automatic cleanup — without this, DOM from one test leaks into
// the next and getByText/getByRole start matching duplicates.
afterEach(cleanup);

test("renders the active unit centered, with the next one visible and no previous one", () => {
  render(<ScrollTaskView units={UNITS} />);
  expect(screen.getByText("Responder cliente")).toBeDefined();
  expect(screen.getByText("Revisar contrato")).toBeDefined();
  expect(screen.getByText("— início —")).toBeDefined();
});

test("renders the empty state when there are no eligible units", () => {
  render(<ScrollTaskView units={[]} />);
  expect(screen.getByText(EMPTY_STATE_PATTERN)).toBeDefined();
});

test("starting execution takes exactly 1 interaction (idle -> running)", () => {
  render(<ScrollTaskView units={UNITS} />);
  expect(screen.getByText("Parado")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
  expect(screen.getByText("Em execução")).toBeDefined();
});

test("completing the active unit advances to the next one and resets to idle", () => {
  render(<ScrollTaskView units={UNITS} />);
  fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
  fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
  expect(screen.getByText("Revisar contrato")).toBeDefined();
  expect(screen.getByText("Parado")).toBeDefined();
});

test("deferring the active unit advances to the next one without marking it completed", () => {
  render(<ScrollTaskView units={UNITS} />);
  fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
  fireEvent.click(screen.getByRole("button", { name: "Adiar" }));
  expect(screen.getByText("Revisar contrato")).toBeDefined();
  expect(screen.getByText("Parado")).toBeDefined();
});

test("double-clicking the card expands it to show scope/refId detail (only once running)", () => {
  render(<ScrollTaskView units={UNITS} />);
  fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
  fireEvent.doubleClick(screen.getByText("Responder cliente"));
  expect(screen.getByText("Detalhado")).toBeDefined();
  expect(screen.getByText(DETALHE_TASK_1_PATTERN)).toBeDefined();
});

test("the only button visible while idle is 'Iniciar' plus the timer options — no direct 'Concluir'", () => {
  render(<ScrollTaskView units={UNITS} />);
  expect(screen.queryByRole("button", { name: "Concluir" })).toBeNull();
});
