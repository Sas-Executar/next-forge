import { buildStatusReport } from "@repo/reports";

export interface StatusTerminal {
  readonly evidenceCount: number;
  readonly header: string;
  readonly position: string;
  readonly prevention: string;
  readonly risk: string;
  readonly tags: readonly string[];
  readonly threePN: {
    readonly problem: string;
    readonly process: string;
    readonly progress: string;
    readonly next: readonly string[];
  };
}

/**
 * status_terminal projection (M07-T04, projections.md). "Síntese
 * compacta: header, progresso por profundidade, posição atual, 3P+N,
 * riscos, prevenção, evidências e tags." Reuses
 * packages/reports' buildStatusReport() rather than recomputing the
 * same 3P+N derivation a second time — this projection just reshapes
 * that report into the compact terminal view.
 */
export const statusTerminal = async (
  workspaceId: string,
  projectId?: string
): Promise<StatusTerminal> => {
  const report = await buildStatusReport(workspaceId, projectId);

  return {
    header: `${report.status} · ${report.progress.project_percent}%`,
    position: report.triptych.current
      ? `${report.triptych.current.title} (${report.triptych.current.state})`
      : "Nada em execução",
    threePN: {
      problem: report.properties.problem,
      process: report.properties.process,
      progress: report.properties.progress,
      next: [
        report.properties.next_1,
        report.properties.next_2,
        report.properties.next_3,
      ].filter((item): item is string => item !== null),
    },
    risk: report.properties.risk,
    prevention: report.properties.prevention,
    evidenceCount: report.evidence_refs.length,
    tags: [report.status, `${report.progress.project_percent}%`],
  };
};
