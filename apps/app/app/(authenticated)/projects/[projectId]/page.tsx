import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { forWorkspace } from "@repo/database";
import { requireWorkspace } from "@repo/auth/server";
import type { TaskState } from "@repo/schemas";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreateTaskForm } from "./components/create-task-form";

interface ProjectPageProperties {
  readonly params: Promise<{ projectId: string }>;
}

const STATE_LABEL_PT: Record<TaskState, string> = {
  BACKLOG_VALIDATED: "Validado",
  READY: "Pronto",
  DOING: "Em execução",
  VERIFY: "Verificar",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
};

const STATE_BADGE_VARIANT: Record<
  TaskState,
  "default" | "secondary" | "outline" | "destructive"
> = {
  BACKLOG_VALIDATED: "outline",
  READY: "secondary",
  DOING: "default",
  VERIFY: "secondary",
  DONE: "outline",
  BLOCKED: "destructive",
};

export const generateMetadata = async ({
  params,
}: ProjectPageProperties): Promise<Metadata> => {
  const { projectId } = await params;
  const workspace = await requireWorkspace();
  const db = forWorkspace(workspace.id);
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });
  return { title: project?.name ?? "Projeto" };
};

const ProjectPage = async ({ params }: ProjectPageProperties) => {
  const { projectId } = await params;
  const workspace = await requireWorkspace();
  const db = forWorkspace(workspace.id);

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        orderBy: { createdAt: "asc" },
        include: {
          dependenciesFrom: { include: { toTask: { select: { title: true } } } },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const doneCount = project.tasks.filter((task) => task.state === "DONE").length;
  const progressPercent =
    project.tasks.length === 0
      ? 0
      : Math.round((doneCount / project.tasks.length) * 100);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
        <p className="mt-1 text-muted-foreground text-sm">
          {doneCount}/{project.tasks.length} tarefas concluídas ({progressPercent}%
          — calculado, não armazenado)
        </p>
      </div>

      <CreateTaskForm
        existingTasks={project.tasks.map((task) => ({
          id: task.id,
          title: task.title,
        }))}
        projectId={project.id}
      />

      {project.tasks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma tarefa ainda</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {project.tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.dependenciesFrom.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      depende de:{" "}
                      {task.dependenciesFrom
                        .map((dep) => dep.toTask.title)
                        .join(", ")}
                    </p>
                  )}
                </div>
                <Badge variant={STATE_BADGE_VARIANT[task.state]}>
                  {STATE_LABEL_PT[task.state]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectPage;
