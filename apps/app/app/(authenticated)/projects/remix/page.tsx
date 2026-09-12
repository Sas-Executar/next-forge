import { requireWorkspace } from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import type { Metadata } from "next";
import { TaskListView } from "../../components/task-list-view";
import { ViewModeToggle } from "../../components/view-mode-toggle";

export const metadata: Metadata = {
  title: "Remix",
  description:
    "Agregação multi-projeto — não duplica tarefas nem cria um projeto sintético.",
};

interface RemixPageProperties {
  readonly searchParams: Promise<{ view?: string }>;
}

/**
 * Remix Multi-project scope (SPEC-WORKSPACE-001 §4, Blueprint, read-only):
 * "aggregates references, does not duplicate tasks or create a synthetic
 * project." Each task is still queried and rendered as its real Task row
 * under its real Project — this route only changes what's fetched
 * (every project's tasks in one query, `projectName` attached for
 * display) and how it's grouped, never the underlying rows.
 */
const RemixPage = async ({ searchParams }: RemixPageProperties) => {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "kanban" ? "kanban" : "lista";

  const workspace = await requireWorkspace();
  const db = forWorkspace(workspace.id);

  const tasks = await db.task.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      project: { select: { name: true } },
      dependenciesFrom: { include: { toTask: { select: { title: true } } } },
    },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Remix</h1>
          <p className="text-muted-foreground">
            Todas as tarefas de todos os projetos, em uma visão só —{" "}
            {tasks.length} tarefas de{" "}
            {new Set(tasks.map((task) => task.projectId)).size} projetos.
          </p>
        </div>
        <ViewModeToggle current={view} />
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhuma tarefa em nenhum projeto ainda.
        </p>
      ) : (
        <TaskListView
          tasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            state: task.state,
            projectName: task.project?.name ?? "Sem projeto",
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

export default RemixPage;
