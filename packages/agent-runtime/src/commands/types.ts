/**
 * The 5 primary Copiloto commands (SKILL.md "Comandos principais" +
 * references/commands.md's verbal IDs). Secondary commands (/mapa,
 * /evidencia, /bloqueio, /atualizar, /contexto, /capacidade, /mudanca,
 * /processo, /procedimento, /risco, /conformidade, /situacao) and their
 * legacy aliases are out of scope for M06 — they route to capabilities
 * (Mapa-OS, capacity, process/procedure/risk/compliance management)
 * this plan schedules in later milestones (M07, M11, M16), not
 * implemented here as a stub.
 */
export const PRIMARY_COMMAND_IDS = [
  "bomdia",
  "agora",
  "estado",
  "fechardia",
  "replanejamento",
] as const;

export type PrimaryCommandId = (typeof PRIMARY_COMMAND_IDS)[number];

export const COMMAND_SLASH_MAP: Readonly<Record<string, PrimaryCommandId>> = {
  "/bomdia": "bomdia",
  "/agora": "agora",
  "/estado": "estado",
  "/fechardia": "fechardia",
  "/replanejamento": "replanejamento",
};
