/**
 * Typed payload for the Prisma A4 V4 template (templates/
 * status-report-prisma-a4-v4.html) — one field per namespace group the
 * template's 100 placeholders actually use (DOC_, EPIC_, CALENDAR_ and
 * RESULT_ prefixes), per SKILL.md ("Não reintroduza tokens legados").
 */
export interface PrismaKpi {
  readonly caption: string;
  readonly label: string;
  readonly value: string;
}

export interface PrismaCalendarDay {
  readonly date: string;
  readonly focus: string;
  readonly number: string;
  readonly title: string;
  readonly track1: string;
  readonly track2: string;
  /** Only day 7 has a third track slot in the template. */
  readonly track3?: string;
  readonly weekday: string;
}

export interface PrismaResultItem {
  readonly description: string;
  readonly status: string;
  readonly title: string;
}

export interface PrismaA4Payload {
  readonly calendar: {
    readonly title: string;
    readonly eyebrow: string;
    readonly weekId: string;
    readonly period: string;
    readonly days: readonly [
      PrismaCalendarDay,
      PrismaCalendarDay,
      PrismaCalendarDay,
      PrismaCalendarDay,
      PrismaCalendarDay,
      PrismaCalendarDay,
      PrismaCalendarDay,
    ];
  };
  readonly doc: {
    readonly topEyebrow: string;
    readonly periodShort: string;
    readonly trace: string;
  };
  readonly epic: {
    readonly title: string;
    readonly number: string;
    readonly state: string;
    readonly progressPct: string;
    readonly eyebrow: string;
    readonly description: string;
    readonly intentLabel: string;
    readonly intentTitle: string;
    readonly intentText: string;
    readonly kpis: readonly [PrismaKpi, PrismaKpi, PrismaKpi, PrismaKpi];
  };
  readonly result: {
    readonly title: string;
    readonly eyebrow: string;
    readonly meta: string;
    readonly heroTag: string;
    readonly heroTitle: string;
    readonly heroDescription: string;
    readonly heroStateLabel: string;
    readonly heroStateValue: string;
    readonly items: readonly [
      PrismaResultItem,
      PrismaResultItem,
      PrismaResultItem,
      PrismaResultItem,
    ];
    readonly nextLabel: string;
    readonly nextValue: string;
  };
}
