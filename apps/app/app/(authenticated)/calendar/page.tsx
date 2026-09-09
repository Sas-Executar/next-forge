import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { forWorkspace } from "@repo/database";
import type { Metadata } from "next";
import { resolveWorkspace } from "../lib/resolve-workspace";

export const metadata: Metadata = {
  title: "Calendário",
  description: "Entregáveis por prazo — calendário influencia capacidade, não promove progresso.",
};

/**
 * Time Projection (SPEC-WORKSPACE-001 §2). "Calendário influencia
 * capacidade, não promove progresso automaticamente" (Blueprint
 * invariant, ONBOARDING.md:602) — this view is strictly read-only, a
 * grouped list of Deliverable.dueDate rather than a fabricated grid
 * widget (no calendar-grid component exists in this design system, and
 * building one is out of proportion for this milestone's scope).
 */
const CalendarPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const deliverables = await db.deliverable.findMany({
    where: { dueDate: { not: null } },
    orderBy: { dueDate: "asc" },
    include: { project: { select: { name: true } } },
  });

  const byMonth = new Map<string, typeof deliverables>();
  for (const deliverable of deliverables) {
    const key = deliverable.dueDate?.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    if (!key) {
      continue;
    }
    const bucket = byMonth.get(key) ?? [];
    bucket.push(deliverable);
    byMonth.set(key, bucket);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Calendário</h1>
        <p className="text-muted-foreground">
          {deliverables.length} entregáveis com prazo, agrupados por mês.
        </p>
      </div>

      {byMonth.size === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum prazo definido</CardTitle>
            <CardDescription>
              Defina um prazo ao criar um entregável para aparecer aqui.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        Array.from(byMonth.entries()).map(([month, items]) => (
          <Card key={month}>
            <CardHeader>
              <CardTitle className="text-base capitalize">{month}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {items.map((deliverable) => (
                <div
                  className="flex items-center justify-between text-sm"
                  key={deliverable.id}
                >
                  <span>{deliverable.title}</span>
                  <span className="text-muted-foreground">
                    {deliverable.dueDate?.toLocaleDateString("pt-BR")} ·{" "}
                    {deliverable.project?.name ?? "Sem projeto"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default CalendarPage;
