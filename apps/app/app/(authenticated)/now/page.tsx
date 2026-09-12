import { nextAction } from "@repo/application";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Metadata } from "next";
import { TaskStateBadge } from "../components/task-state-badge";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { TaskActions } from "./components/task-actions";

export const metadata: Metadata = {
  title: "Agora",
  description: "A única próxima ação elegível — WIP=1.",
};

const NowPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;

  const result = await nextAction(workspace.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Agora</h1>
        <p className="text-muted-foreground">
          A única próxima ação elegível — WIP=1.
        </p>
      </div>

      {result.kind === "NONE" && (
        <Card>
          <CardHeader>
            <CardTitle>Nada elegível agora</CardTitle>
            <CardDescription>
              Não há tarefas prontas com dependências satisfeitas. Crie uma
              tarefa ou valide o backlog em /projects.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {result.kind === "TIE" && (
        <Card>
          <CardHeader>
            <CardTitle>Empate — decisão humana necessária</CardTitle>
            <CardDescription>
              {result.candidates.length} tarefas empatadas nos critérios
              implementados (criticidade, prazo). Escolha manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {result.candidates.map((task) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={task.id}
              >
                <span className="font-medium">{task.title}</span>
                <TaskActions task={task} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result.kind === "SELECTED" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{result.task.title}</CardTitle>
              <TaskStateBadge state={result.task.state} />
            </div>
            <CardDescription>{result.reason}</CardDescription>
          </CardHeader>
          <CardContent>
            {result.task.description && (
              <p className="mb-4 text-muted-foreground text-sm">
                {result.task.description}
              </p>
            )}
            <TaskActions task={result.task} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NowPage;
