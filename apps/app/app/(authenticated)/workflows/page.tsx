import { forWorkspace } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Metadata } from "next";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { RunWorkflowButton } from "./run-workflow-button";

export const metadata: Metadata = {
  title: "Workflows",
  description:
    "WorkflowDefinition — processo configurado (SPEC-WORKSPACE-001 §2).",
};

const RUN_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  SUCCESS: "secondary",
  FAILED: "destructive",
  RUNNING: "default",
  SCHEDULED: "outline",
};

/**
 * /workflows (M10-T06). WorkflowDefinition — "processo configurado"
 * (SPEC-WORKSPACE-001 §2). Lists real WorkflowDefinition rows and each
 * one's most recent WorkflowRun; "Executar agora" runs the exact
 * packages/automation runWorkflow executor.
 */
const WorkflowsPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const workflows = await db.workflowDefinition.findMany({
    orderBy: { createdAt: "desc" },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 1 } },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Workflows</h1>
        <p className="text-muted-foreground">
          {workflows.length} workflow(s) — WorkflowDefinition.
        </p>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum workflow configurado</CardTitle>
            <CardDescription>
              Workflows são criados via seed/configuração — não há formulário de
              criação ainda.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        workflows.map((workflow) => {
          const lastRun = workflow.runs[0];
          return (
            <Card key={workflow.id}>
              <CardHeader>
                <CardTitle className="text-base">{workflow.name}</CardTitle>
                {workflow.description && (
                  <CardDescription>{workflow.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4 text-sm">
                <div>
                  {lastRun ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          RUN_STATUS_VARIANT[lastRun.status] ?? "outline"
                        }
                      >
                        {lastRun.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        {lastRun.startedAt.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Nunca executado.
                    </span>
                  )}
                </div>
                <RunWorkflowButton workflowDefinitionId={workflow.id} />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default WorkflowsPage;
