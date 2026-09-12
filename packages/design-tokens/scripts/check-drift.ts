#!/usr/bin/env bun
/**
 * ADR-DS-001 Required Change #10 — CI gate for token drift.
 *
 * `css/variables.css` is hand-authored to mirror `src/*.ts` 1:1 (see that
 * file's own header comment). This script is the enforcement: it reads
 * both, resolves the CSS custom properties (including one level of
 * `var(--x)` indirection — e.g. `--ds-color-background: var(--color-
 * neutral-1)`), and diffs every value against the TS SOT. A mismatch here
 * means someone edited one file and not the other — CI fails until both
 * agree again.
 *
 * Run: `bun run packages/design-tokens/scripts/check-drift.ts`
 * (or `bun run check:drift` from packages/design-tokens).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { azure, green, neutral } from "../src/primitives";
import { radius } from "../src/radius";
import { shadow } from "../src/shadows";
import { container, spacing } from "../src/spacing";
import { dark } from "../src/themes/dark";
import { light } from "../src/themes/light";
import { fontFamily, fontSize } from "../src/typography";

const CSS_PATH = path.join(import.meta.dirname, "../css/variables.css");

type CssVars = Record<string, string>;

function parseBlock(source: string, selector: string): string | null {
  const match = source.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, "s"));
  return match ? match[1] : null;
}

function parseVars(blockText: string): CssVars {
  const vars: CssVars = {};
  const re = /--([\w-]+):\s*([^;]+);/g;
  let m: RegExpExecArray | null = re.exec(blockText);
  while (m) {
    vars[m[1]] = m[2].trim();
    m = re.exec(blockText);
  }
  return vars;
}

const VAR_INDIRECTION = /^var\(--([\w-]+)\)$/;

/** Resolves a single `var(--x)` indirection against a combined lookup. */
function resolve(value: string, lookup: CssVars): string {
  const varMatch = value.match(VAR_INDIRECTION);
  if (varMatch && lookup[varMatch[1]]) {
    return lookup[varMatch[1]];
  }
  return value;
}

// Strip CSS comments first — a comment that happens to mention a
// `--custom-property` name (as several in this file do, documenting the
// naming convention) would otherwise be parsed as a real declaration.
const css = readFileSync(CSS_PATH, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rootBlock = parseBlock(css, ":root");
const darkBlock = parseBlock(css, "\\.dark");

if (!(rootBlock && darkBlock)) {
  console.error(
    "check-drift: could not locate :root/.dark blocks in css/variables.css"
  );
  process.exit(1);
}

const rootVars = parseVars(rootBlock);
const darkVarsOwn = parseVars(darkBlock);
// .dark inherits any custom property it doesn't redefine.
const darkVars: CssVars = { ...rootVars, ...darkVarsOwn };

const mismatches: string[] = [];

function check(label: string, cssValue: string | undefined, expected: string) {
  if (cssValue === undefined) {
    mismatches.push(`${label}: missing in css/variables.css`);
    return;
  }
  if (cssValue.toLowerCase() !== expected.toLowerCase()) {
    mismatches.push(`${label}: css="${cssValue}" ts="${expected}"`);
  }
}

// Primitives — Green/Azure/Neutral ramps.
for (const [name, ramp] of Object.entries({ green, azure, neutral })) {
  for (let step = 1; step <= 12; step++) {
    check(
      `color-${name}-${step}`,
      rootVars[`color-${name}-${step}`],
      ramp[step as keyof typeof ramp]
    );
  }
}

// Typography.
for (const [key, px] of Object.entries(fontSize)) {
  check(`font-size-${key}`, rootVars[`font-size-${key}`], `${px}px`);
}
if (!rootVars["font-family-sans"]?.includes(fontFamily.sans)) {
  mismatches.push(
    `font-family-sans: css="${rootVars["font-family-sans"]}" missing ts family "${fontFamily.sans}"`
  );
}
if (!rootVars["font-family-mono"]?.includes(fontFamily.mono)) {
  mismatches.push(
    `font-family-mono: css="${rootVars["font-family-mono"]}" missing ts family "${fontFamily.mono}"`
  );
}

// Spacing + containers.
for (const [key, px] of Object.entries(spacing)) {
  check(`space-${key}`, rootVars[`space-${key}`], `${px}px`);
}
check("container-page", rootVars["container-page"], `${container.page}px`);
check(
  "container-reading",
  rootVars["container-reading"],
  `${container.reading}px`
);

// Radius (canonical scale — --ds-radius-* per css/variables.css's own convention).
check("radius-none", rootVars["radius-none"], `${radius.none}px`);
check("ds-radius-sm", rootVars["ds-radius-sm"], `${radius.sm}px`);
check("ds-radius-md", rootVars["ds-radius-md"], `${radius.md}px`);
check("ds-radius-lg", rootVars["ds-radius-lg"], `${radius.lg}px`);
check("ds-radius-xl", rootVars["ds-radius-xl"], `${radius.xl}px`);
check("radius-pill", rootVars["radius-pill"], `${radius.pill}px`);
check("radius-full", rootVars["radius-full"], `${radius.full}px`);

// Shadows.
check("shadow-sm", rootVars["shadow-sm"], shadow.sm);
check("shadow-md", rootVars["shadow-md"], shadow.md);
check("shadow-hover", rootVars["shadow-hover"], shadow.hover);

// Semantic layer — light (:root) and dark (.dark).
for (const [themeName, theme, vars] of [
  ["light", light, rootVars],
  ["dark", dark, darkVars],
] as const) {
  check(
    `${themeName} ds-color-background`,
    resolve(vars["ds-color-background"], vars),
    theme.color.background
  );
  check(
    `${themeName} ds-color-surface`,
    resolve(vars["ds-color-surface"], vars),
    theme.color.surface
  );
  check(
    `${themeName} ds-color-text-primary`,
    resolve(vars["ds-color-text-primary"], vars),
    theme.color.text.primary
  );
  check(
    `${themeName} ds-color-text-secondary`,
    resolve(vars["ds-color-text-secondary"], vars),
    theme.color.text.secondary
  );
  check(
    `${themeName} ds-color-action-primary`,
    resolve(vars["ds-color-action-primary"], vars),
    theme.color.action.primary
  );
  check(
    `${themeName} ds-color-action-secondary`,
    resolve(vars["ds-color-action-secondary"], vars),
    theme.color.action.secondary
  );
  check(
    `${themeName} ds-color-status-success`,
    resolve(vars["ds-color-status-success"], vars),
    theme.color.status.success
  );
  check(
    `${themeName} ds-color-status-warning`,
    resolve(vars["ds-color-status-warning"], vars),
    theme.color.status.warning
  );
  check(
    `${themeName} ds-color-status-error`,
    resolve(vars["ds-color-status-error"], vars),
    theme.color.status.error
  );
  check(
    `${themeName} ds-color-border`,
    resolve(vars["ds-color-border"], vars),
    theme.color.border
  );
  check(
    `${themeName} ds-color-focus`,
    resolve(vars["ds-color-focus"], vars),
    theme.color.focus
  );
}

if (mismatches.length > 0) {
  console.error(
    `❌ Token drift detected between packages/design-tokens/src/*.ts and css/variables.css (${mismatches.length} mismatch(es)):\n`
  );
  for (const line of mismatches) {
    console.error(`  - ${line}`);
  }
  console.error(
    "\nFix: update css/variables.css to match the TS SOT (or vice versa if the TS value is wrong)."
  );
  process.exit(1);
}

console.log(
  "✅ No token drift — css/variables.css matches packages/design-tokens/src/*.ts."
);
