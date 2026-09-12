import { forWorkspace } from "@repo/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { TaskState } from "@repo/schemas";
import { TASK_STATE_LABEL_PT } from "@repo/schemas";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveWorkspace } from "../lib/resolve-workspace";

export const metadata: Metadata = {
  title: "Visão geral",
  description:
    "Projeto/Portfolio Projection — leitura agregada, não altera estado.",
};

const STATE_ORDER: readonly TaskState[] = [
  "BACKLOG_VALIDATED",
  "READY",
  "DOING",
  "VERIFY",
  "DONE",
  "BLOCKED",
];

/**
 * Project/Portfolio Projection (SPEC-WORKSPACE-001 §2): read aggregate
 * across the whole workspace. Purely derived — nothing here is stored,
 * every number is computed on render (same principle as /projects'
 * completion percentage).
 */
const OverviewPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const [projectCount, taskCountsByState, recentEvents] = await Promise.all([
    db.project.count(),
    db.task.groupBy({ by: ["state"], _count: { state: true } }),
    db.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const countByState = new Map(
    taskCountsByState.map((row) => [row.state, row._count.state])
  );
  const totalTasks = taskCountsByState.reduce(
    (sum, row) => sum + row._count.state,
    0
  );
  const doneTasks = countByState.get("DONE") ?? 0;
  const overallPercent =
    totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Visão geral</h1>
        <p className="text-muted-foreground">
          {projectCount} projetos, {totalTasks} tarefas, {overallPercent}%
          concluído — agregado, não altera estado.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {STATE_ORDER.map((state) => (
          <Card key={state}>
            <CardHeader className="pb-2">
              <CardDescription>{TASK_STATE_LABEL_PT[state]}</CardDescription>
              <CardTitle className="text-3xl">
                {countByState.get(state) ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade recente</CardTitle>
          <CardDescription>Últimos 10 eventos de auditoria.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recentEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma atividade ainda.
            </p>
          ) : (
            recentEvents.map((event) => (
              <div
                className="flex items-center justify-between text-sm"
                key={event.id}
              >
                <span>
                  {event.action} · {event.objectType}
                </span>
                <span className="text-muted-foreground">
                  {event.createdAt.toLocaleString("pt-BR")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Link
        className="text-primary text-sm underline-offset-4 hover:underline"
        href="/projects"
      >
        Ver todos os projetos →
      </Link>
    </div>
  );
};

export default OverviewPage;
