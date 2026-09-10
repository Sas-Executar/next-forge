import { forWorkspace } from "@repo/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Metadata } from "next";
import { TaskStateBadge } from "../components/task-state-badge";
import { dayRange } from "../lib/day-range";
import { resolveWorkspace } from "../lib/resolve-workspace";

export const metadata: Metadata = {
  title: "Hoje",
};

/**
 * Temporal Projection: today (SPEC-WORKSPACE-001 §2). Two real signals
 * exist for "today" in this schema: the task currently DOING (live
 * state, not date-based) and Deliverable.dueDate falling today —
 * there's no per-task scheduled-date field, so "today's planned tasks"
 * beyond the WIP one isn't something this schema can answer yet.
 */
const TodayPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);
  const { start, end } = dayRange(0);

  const [wipTask, dueToday, eventsToday] = await Promise.all([
    db.task.findFirst({ where: { state: "DOING" } }),
    db.deliverable.findMany({
      where: { dueDate: { gte: start, lt: end } },
      include: { project: { select: { name: true } } },
    }),
    db.auditEvent.count({ where: { createdAt: { gte: start, lt: end } } }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Hoje</h1>
        <p className="text-muted-foreground">
          {eventsToday} eventos registrados hoje.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em execução</CardTitle>
        </CardHeader>
        <CardContent>
          {wipTask ? (
            <div className="flex items-center justify-between">
              <span className="font-medium">{wipTask.title}</span>
              <TaskStateBadge state={wipTask.state} />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nada em execução — veja /now para a próxima ação elegível.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregáveis com prazo hoje</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {dueToday.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum.</p>
          ) : (
            dueToday.map((deliverable) => (
              <div className="text-sm" key={deliverable.id}>
                {deliverable.title} —{" "}
                <span className="text-muted-foreground">
                  {deliverable.project?.name ?? "Sem projeto"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <CardDescription>
        Sem campo de data agendada por tarefa neste schema — "hoje" mostra a
        tarefa em execução e prazos de entregáveis, não uma agenda completa.
      </CardDescription>
    </div>
  );
};

export default TodayPage;
