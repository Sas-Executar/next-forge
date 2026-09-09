import type { OrchestratorOutput } from "./output-schema";

/**
 * Renders an OrchestratorOutput as the fixed pt-BR block SKILL.md
 * specifies for "Emitir":
 *   [PROGRESSO] [SPRINT/C72] [GATE]
 *   AGORA: ID — ação
 *   TEMPO: duração
 *   CONCLUI QUANDO: DoD
 *   EVIDÊNCIA: prova esperada
 *   PRÓXIMA: uma ação
 *
 * Adapted to this schema's actual fields (no sprint/C72/gate concept
 * exists here — see estado.ts's own disclosed gap) and to skip
 * TEMPO/CONCLUI QUANDO/EVIDÊNCIA lines when a command has nothing
 * honest to put there, rather than print an empty field.
 */
export const formatOrchestratorOutputText = (
  output: OrchestratorOutput
): string => {
  const lines = [
    `[${output.status}] ${output.ui.headline}`,
    `AGORA: ${output.ui.agora}`,
  ];

  if (output.ui.tempo) {
    lines.push(`TEMPO: ${output.ui.tempo}`);
  }
  if (output.ui.conclui_quando) {
    lines.push(`CONCLUI QUANDO: ${output.ui.conclui_quando}`);
  }
  if (output.ui.evidencia) {
    lines.push(`EVIDÊNCIA: ${output.ui.evidencia}`);
  }
  lines.push(`PRÓXIMA: ${output.ui.proxima_acao}`);

  if (output.warnings && output.warnings.length > 0) {
    lines.push("", ...output.warnings.map((warning) => `⚠️ ${warning}`));
  }
  if (output.ui.mermaid) {
    lines.push("", "```mermaid", output.ui.mermaid, "```");
  }

  return lines.join("\n");
};
