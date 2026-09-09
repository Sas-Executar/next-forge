import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { rankEligibleTasks } from "@repo/application";
import { forWorkspace } from "@repo/database";
import type { Metadata } from "next";
import { TaskStateBadge } from "../components/task-state-badge";
import { resolveWorkspace } from "../lib/resolve-workspace";

export const metadata: Metadata = {
  title: "Sprint",
  description: "Execution Window — a fila de trabalho elegível, além da única ação de /now.",
};

const SPRINT_WINDOW_SIZE = 5;

/**
 * Execution Window (SPEC-WORKSPACE-001 §2). Where /now shows the single
 * WIP=1 action, /sprint shows the next few in the same real ranking
 * (rank-eligible-tasks.ts, shared with nextAction) — a preview of the
 * queue, not a second selection algorithm.
 */
const SprintPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const [wipTask, ranked] = await Promise.all([
    db.task.findFirst({ where: { state: "DOING" } }),
    rankEligibleTasks(workspace.id),
  ]);

  const window = ranked.slice(0, SPRINT_WINDOW_SIZE);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Sprint</h1>
        <p className="text-muted-foreground">
          Janela de execução — próximas {SPRINT_WINDOW_SIZE} elegíveis, na
          mesma ordem usada por /now.
        </p>
      </div>

      {wipTask && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{wipTask.title}</CardTitle>
              <TaskStateBadge state={wipTask.state} />
            </div>
            <CardDescription>Em execução agora (WIP=1)</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fila</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {window.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nada elegível na fila agora.
            </p>
          ) : (
            window.map((ranked_, index) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={ranked_.task.id}
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">
                    #{index + 1}
                  </span>
                  <span className="font-medium">{ranked_.task.title}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {ranked_.criticality > 0 &&
                    `desbloqueia ${ranked_.criticality} · `}
                  {ranked_.dueDate
                    ? ranked_.dueDate.toLocaleDateString("pt-BR")
                    : "sem prazo"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SprintPage;
