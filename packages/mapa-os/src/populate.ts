import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaA4Payload } from "./types";

// `import.meta.dirname` isn't reliably populated for this module inside
// Next's Turbopack server bundle (any route importing @repo/mapa-os pulls
// it in, including during build-time page data collection) — derive the
// directory from `import.meta.url` instead, which bundlers do rewrite.
// Read lazily, on first real use, so a route that never calls into this
// still never touches the filesystem during build.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
let templateHtml: string | undefined;

const getTemplateHtml = (): string => {
  if (templateHtml === undefined) {
    const templatePath = path.join(
      moduleDir,
      "../templates/status-report-prisma-a4-v4.html"
    );
    templateHtml = readFileSync(templatePath, "utf-8");
  }
  return templateHtml;
};

const PLACEHOLDER_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;

const templateKeys = (): string[] => {
  const keys = new Set<string>();
  for (const match of getTemplateHtml().matchAll(PLACEHOLDER_PATTERN)) {
    keys.add(match[1]);
  }
  return [...keys];
};

/**
 * Thrown instead of silently truncating or shrinking the template —
 * SKILL.md: "Se não couber sem perda, retorne erro de fit" — and
 * instead of silently leaving a placeholder unfilled. `issues` names
 * every offending field so the caller can condense/supply real data,
 * never invent it.
 */
export class PrismaFitError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Prisma A4 fit error:\n${issues.join("\n")}`);
    this.name = "PrismaFitError";
    this.issues = issues;
  }
}

/**
 * Per-field character limits. The Blueprint template's CSS boxes are
 * small (6-7.2pt fields) but SKILL.md and projections.md give no
 * explicit maxLength numbers per placeholder — this is an inferred,
 * documented convention (by field role, not per exact key), not a
 * Blueprint-sourced value. Conservative on purpose: exceeding it throws
 * a PrismaFitError rather than letting the browser silently clip text.
 */
const maxLengthFor = (key: string): number => {
  if (key.endsWith("_TITLE")) {
    return 60;
  }
  if (key.includes("DESCRIPTION") || key.endsWith("_TEXT")) {
    return 180;
  }
  if (key.includes("KPI") && key.endsWith("_VALUE")) {
    return 16;
  }
  if (key.includes("TRACK")) {
    return 24;
  }
  return 40;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const dayKey = (index: number, suffix: string): string =>
  `CALENDAR_DAY_${String(index + 1).padStart(2, "0")}_${suffix}`;

const flatten = (payload: PrismaA4Payload): Record<string, string> => {
  const map: Record<string, string> = {
    DOC_TOP_EYEBROW: payload.doc.topEyebrow,
    DOC_PERIOD_SHORT: payload.doc.periodShort,
    DOC_TRACE: payload.doc.trace,

    EPIC_TITLE: payload.epic.title,
    EPIC_NUMBER: payload.epic.number,
    EPIC_STATE: payload.epic.state,
    EPIC_PROGRESS_PCT: payload.epic.progressPct,
    EPIC_EYEBROW: payload.epic.eyebrow,
    EPIC_DESCRIPTION: payload.epic.description,
    EPIC_INTENT_LABEL: payload.epic.intentLabel,
    EPIC_INTENT_TITLE: payload.epic.intentTitle,
    EPIC_INTENT_TEXT: payload.epic.intentText,

    CALENDAR_TITLE: payload.calendar.title,
    CALENDAR_EYEBROW: payload.calendar.eyebrow,
    CALENDAR_WEEK_ID: payload.calendar.weekId,
    CALENDAR_PERIOD: payload.calendar.period,

    RESULT_TITLE: payload.result.title,
    RESULT_EYEBROW: payload.result.eyebrow,
    RESULT_META: payload.result.meta,
    RESULT_HERO_TAG: payload.result.heroTag,
    RESULT_HERO_TITLE: payload.result.heroTitle,
    RESULT_HERO_DESCRIPTION: payload.result.heroDescription,
    RESULT_HERO_STATE_LABEL: payload.result.heroStateLabel,
    RESULT_HERO_STATE_VALUE: payload.result.heroStateValue,
    RESULT_NEXT_LABEL: payload.result.nextLabel,
    RESULT_NEXT_VALUE: payload.result.nextValue,
  };

  payload.epic.kpis.forEach((kpi, index) => {
    const n = String(index + 1).padStart(2, "0");
    map[`EPIC_KPI_${n}_LABEL`] = kpi.label;
    map[`EPIC_KPI_${n}_VALUE`] = kpi.value;
    map[`EPIC_KPI_${n}_CAPTION`] = kpi.caption;
  });

  payload.calendar.days.forEach((day, index) => {
    map[dayKey(index, "NUMBER")] = day.number;
    map[dayKey(index, "WEEKDAY")] = day.weekday;
    map[dayKey(index, "DATE")] = day.date;
    map[dayKey(index, "TITLE")] = day.title;
    map[dayKey(index, "FOCUS")] = day.focus;
    map[dayKey(index, "TRACK_01")] = day.track1;
    map[dayKey(index, "TRACK_02")] = day.track2;
    if (index === 6) {
      map[dayKey(index, "TRACK_03")] = day.track3 ?? "";
    }
  });

  payload.result.items.forEach((item, index) => {
    const n = String(index + 1).padStart(2, "0");
    map[`RESULT_ITEM_${n}_TITLE`] = item.title;
    map[`RESULT_ITEM_${n}_DESCRIPTION`] = item.description;
    map[`RESULT_ITEM_${n}_STATUS`] = item.status;
  });

  return map;
};

/**
 * Populates the immutable Prisma A4 V4 template (M07-T03). Never
 * shrinks the template or leaves a `{{PLACEHOLDER}}` unfilled — either
 * every one of the template's 100 real placeholders gets a real value
 * within its length limit, or this throws a PrismaFitError naming
 * exactly what's missing or oversized.
 */
export const populatePrismaA4 = (payload: PrismaA4Payload): string => {
  const map = flatten(payload);
  const issues: string[] = [];

  for (const key of templateKeys()) {
    const value = map[key];
    if (value === undefined || value.trim().length === 0) {
      issues.push(`missing value for ${key}`);
      continue;
    }
    const limit = maxLengthFor(key);
    if (value.length > limit) {
      issues.push(`${key} exceeds ${limit} characters (${value.length})`);
    }
  }

  if (issues.length > 0) {
    throw new PrismaFitError(issues);
  }

  let html = getTemplateHtml();
  for (const [key, value] of Object.entries(map)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value));
  }
  return html;
};
