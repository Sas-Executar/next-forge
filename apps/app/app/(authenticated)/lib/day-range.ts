/**
 * UTC calendar-day boundaries for /today, /tomorrow, /yesterday
 * (M05-T01). A simplification: the Blueprint's "Dia Lógico" concept
 * (skills/executar-mapa-os/SKILL.md) implies a workspace/user-specific
 * logical-day boundary, not necessarily midnight UTC, but specifies no
 * concrete timezone or quiet-hours rule to implement against — UTC
 * midnight is a real, honest boundary, just not the eventually-correct
 * one. Revisit once PERS-* (personalization/timezone) lands.
 */
export const dayRange = (offsetDays: 0 | 1 | -1): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays)
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};
