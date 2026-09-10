import { forWorkspace } from "@repo/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Metadata } from "next";
import { dayRange } from "../lib/day-range";
import { resolveWorkspace } from "../lib/resolve-workspace";

export const metadata: Metadata = {
  title: "Amanhã",
};

/**
 * Temporal Projection: tomorrow (SPEC-WORKSPACE-001 §2). The thinnest of
 * the three — Deliverable.dueDate is the only real forward-looking date
 * signal in this schema; there's no per-task scheduling. Calendar
 * influences capacity, it doesn't promote progress on its own (Blueprint
 * invariant, OBJETIVOS...:957 / ONBOARDING.md:602) — this view is
 * read-only for the same reason.
 */
const TomorrowPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);
  const { start, end } = dayRange(1);

  const dueTomorrow = await db.deliverable.findMany({
    where: { dueDate: { gte: start, lt: end } },
    include: { project: { select: { name: true } } },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Amanhã</h1>
        <p className="text-muted-foreground">Entregáveis com prazo amanhã.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prazos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {dueTomorrow.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum entregável com prazo amanhã.
            </p>
          ) : (
            dueTomorrow.map((deliverable) => (
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
        Sem campo de data agendada por tarefa neste schema — "amanhã" mostra
        apenas prazos de entregáveis, não uma agenda de tarefas planejadas.
      </CardDescription>
    </div>
  );
};

export default TomorrowPage;
