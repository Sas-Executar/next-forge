import { forWorkspace } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Metadata } from "next";
import { resolveWorkspace } from "../lib/resolve-workspace";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Deliverables/Milestones — ordenados por prazo.",
};

/**
 * Deliverables/Milestones view (SPEC-WORKSPACE-001 §2). Every
 * deliverable in the workspace, ordered by dueDate — overdue first,
 * then nearest upcoming, then no-date last. Per-deliverable completion
 * is derived from its own tasks, same principle as /projects and
 * /overview.
 */
const RoadmapPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const deliverables = await db.deliverable.findMany({
    include: {
      project: { select: { name: true } },
      tasks: { select: { state: true } },
    },
  });

  const now = new Date();
  const sorted = [...deliverables].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    if (a.dueDate) {
      return -1;
    }
    if (b.dueDate) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Roadmap</h1>
        <p className="text-muted-foreground">
          {deliverables.length} entregáveis, ordenados por prazo.
        </p>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum entregável ainda</CardTitle>
            <CardDescription>
              Entregáveis são criados a partir de um projeto.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((deliverable) => {
            const doneCount = deliverable.tasks.filter(
              (task) => task.state === "DONE"
            ).length;
            const percent =
              deliverable.tasks.length === 0
                ? 0
                : Math.round((doneCount / deliverable.tasks.length) * 100);
            const isOverdue =
              deliverable.dueDate !== null && deliverable.dueDate < now;

            return (
              <Card key={deliverable.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{deliverable.title}</CardTitle>
                    {deliverable.dueDate ? (
                      <Badge variant={isOverdue ? "destructive" : "secondary"}>
                        {deliverable.dueDate.toLocaleDateString("pt-BR")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sem prazo</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {deliverable.project?.name ?? "Sem projeto"} · {doneCount}/
                    {deliverable.tasks.length} tarefas ({percent}
                    %)
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
