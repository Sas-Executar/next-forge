import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { forWorkspace } from "@repo/database";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { CreateProjectForm } from "./components/create-project-form";

export const metadata: Metadata = {
  title: "Projetos",
};

const ProjectsPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;

  const db = forWorkspace(workspace.id);
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true, deliverables: true } } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Projetos</h1>
          <p className="text-muted-foreground">Escopo de projeto único — visão Lista.</p>
        </div>
        <Link
          className="text-primary text-sm underline-offset-4 hover:underline"
          href="/projects/remix"
        >
          Ver todas em Remix →
        </Link>
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
