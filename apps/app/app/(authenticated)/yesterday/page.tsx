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
  title: "Ontem",
};

/**
 * Temporal Projection: yesterday (SPEC-WORKSPACE-001 §2). The one
 * genuine retrospective view among the three — AuditEvent.createdAt is
 * a real, complete log of every mutation, so "what happened yesterday"
 * is fully answerable, unlike /tomorrow's forward-looking gap.
 */
const YesterdayPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);
  const { start, end } = dayRange(-1);

  const [events, evidenceCreated] = await Promise.all([
    db.auditEvent.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
    }),
    db.evidence.count({ where: { createdAt: { gte: start, lt: end } } }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Ontem</h1>
        <p className="text-muted-foreground">
          {events.length} eventos, {evidenceCreated} evidências registradas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>O que aconteceu</CardTitle>
          <CardDescription>
            Trilha de auditoria completa do dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum evento registrado ontem.
            </p>
          ) : (
            events.map((event) => (
              <div
                className="flex items-center justify-between text-sm"
                key={event.id}
              >
                <span>
                  {event.action} · {event.objectType}
                </span>
                <span className="text-muted-foreground">
                  {event.createdAt.toLocaleTimeString("pt-BR")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YesterdayPage;
