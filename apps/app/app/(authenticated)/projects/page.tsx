import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { forWorkspace } from "@repo/database";
import {
  NoActiveOrganizationError,
  requireWorkspace,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateProjectForm } from "./components/create-project-form";

export const metadata: Metadata = {
  title: "Projetos",
};

const ProjectsPage = async () => {
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
          <p className="text-muted-foreground">
            {error instanceof NoActiveOrganizationError
              ? "Selecione ou crie uma organização para continuar."
              : "Este workspace ainda não foi sincronizado. Tente novamente em instantes."}
          </p>
        </div>
      );
    }
    throw error;
  }

  const db = forWorkspace(workspace.id);
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true, deliverables: true } } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Projetos</h1>
        <p className="text-muted-foreground">Escopo de projeto único — visão Lista.</p>
      </div>

      <CreateProjectForm />

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum projeto ainda</CardTitle>
            <CardDescription>
              Crie o primeiro projeto acima para começar.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <Link href={`/projects/${project.id}`} key={project.id}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{project.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {project._count.tasks} tarefas
                      </Badge>
                      <Badge variant="outline">
                        {project._count.deliverables} entregáveis
                      </Badge>
                    </div>
                  </div>
                  {project.description && (
                    <CardDescription>{project.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
