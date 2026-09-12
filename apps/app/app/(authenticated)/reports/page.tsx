import { forWorkspace } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { StatusReport } from "@repo/reports";
import type { Metadata } from "next";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { GenerateReportButton } from "./generate-report-button";

export const metadata: Metadata = {
  title: "Reports",
  description: "StatusReport — histórico canônico (SPEC-WORKSPACE-001 §2).",
};

type StoredReportProperties = StatusReport["properties"];

const REPORT_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OK: "secondary",
  CONDICIONAL: "outline",
  BLOQUEADO: "destructive",
  ERRO: "destructive",
};

/**
 * /reports (M07-T02). "StatusReport — histórico canônico" — read-only
 * history of persisted StatusReport rows (packages/database's
 * StatusReport model, M02). Generating a new one (the button below)
 * runs the same real, derived computation M04's server actions use
 * elsewhere — nothing here is hand-entered.
 */
const ReportsPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const reports = await db.statusReport.findMany({
    orderBy: { generatedAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Reports</h1>
          <p className="text-muted-foreground">
            {reports.length} relatório(s) — histórico canônico, somente leitura.
          </p>
        </div>
        <GenerateReportButton />
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum relatório ainda</CardTitle>
            <CardDescription>
              Gere o primeiro relatório para começar o histórico.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        reports.map((report) => {
          // Json columns are written exclusively by
          // actions/reports/generate-report.ts from a real StatusReport
          // (packages/reports) — trusted shape from this app's own writer.
          const properties = report.properties as StoredReportProperties;
          const progress = report.progress as StatusReport["progress"];

          return (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {report.generatedAt.toLocaleString("pt-BR")}
                  </CardTitle>
                  <Badge
                    variant={REPORT_STATUS_VARIANT[report.status] ?? "outline"}
                  >
                    {report.status}
                  </Badge>
                </div>
                <CardDescription>
                  {progress.project_percent}% concluído · {progress.today_delta}{" "}
                  evidência(s) hoje.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Problema:</span>{" "}
                  {properties.problem}
                </p>
                <p>
                  <span className="text-muted-foreground">Risco:</span>{" "}
                  {properties.risk}
                </p>
                <p>
                  <span className="text-muted-foreground">Próximas:</span>{" "}
                  {[properties.next_1, properties.next_2, properties.next_3]
                    .filter((item): item is string => item !== null)
                    .join(" · ") || "—"}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default ReportsPage;
