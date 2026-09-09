import {
  Card,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { forWorkspace } from "@repo/database";
import { requireWorkspace } from "@repo/auth/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskListView } from "../../components/task-list-view";
import { ViewModeToggle } from "../../components/view-mode-toggle";
import { CreateTaskForm } from "./components/create-task-form";

interface ProjectPageProperties {
  readonly params: Promise<{ projectId: string }>;
  readonly searchParams: Promise<{ view?: string }>;
}

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

const ProjectPage = async ({ params, searchParams }: ProjectPageProperties) => {
  const { projectId } = await params;
  const { view: viewParam } = await searchParams;
  const view = viewParam === "kanban" ? "kanban" : "lista";

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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold text-2xl">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
          <p className="mt-1 text-muted-foreground text-sm">
            {doneCount}/{project.tasks.length} tarefas concluídas (
            {progressPercent}% — calculado, não armazenado)
          </p>
        </div>
        <ViewModeToggle current={view} />
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
        <TaskListView
          tasks={project.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            state: task.state,
            dependsOnTitles: task.dependenciesFrom.map(
              (dep) => dep.toTask.title
            ),
          }))}
          view={view}
        />
      )}
    </div>
  );
};

export default ProjectPage;
