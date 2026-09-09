import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { nextAction } from "@repo/application";
import {
  NoActiveOrganizationError,
  requireWorkspace,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import type { TaskState } from "@repo/schemas";
import type { Metadata } from "next";
import { TaskActions } from "./components/task-actions";

export const metadata: Metadata = {
  title: "Agora",
  description: "A única próxima ação elegível — WIP=1.",
};

const STATE_LABEL_PT: Record<TaskState, string> = {
  BACKLOG_VALIDATED: "Validado",
  READY: "Pronto",
  DOING: "Em execução",
  VERIFY: "Verificar",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
};

const NowPage = async () => {
  let workspace: Awaited<ReturnType<typeof requireWorkspace>>;
  try {
    workspace = await requireWorkspace();
  } catch (error) {
    if (
      error instanceof NoActiveOrganizationError ||
      error instanceof WorkspaceNotFoundError
    ) {
      return (
        <div className="p-8">
          <Card>
            <CardHeader>
              <CardTitle>Nenhum workspace ativo</CardTitle>
              <CardDescription>
                {error instanceof NoActiveOrganizationError
                  ? "Selecione ou crie uma organização para continuar."
                  : "Este workspace ainda não foi sincronizado. Tente novamente em instantes."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }
    throw error;
  }

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
              <Badge variant="secondary">
                {STATE_LABEL_PT[result.task.state]}
              </Badge>
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
