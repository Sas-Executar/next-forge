import { forWorkspace } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { routineConfigSchema } from "@repo/routines";
import type { Metadata } from "next";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { RunRoutineButton } from "./run-routine-button";

export const metadata: Metadata = {
  title: "Automações",
  description: "RoutineConfig — automação governada (SPEC-WORKSPACE-001 §2).",
};

const RUN_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  SUCCESS: "secondary",
  PARTIAL: "outline",
  BLOCKED: "destructive",
  FAILED: "destructive",
  RUNNING: "default",
  SCHEDULED: "outline",
};

/**
 * /automations (M10-T06). RoutineConfig — "automação governada"
 * (SPEC-WORKSPACE-001 §2). Lists real Routine rows and each one's most
 * recent RoutineRun; "Executar agora" runs the exact same pipeline
 * (packages/routines' runRoutine) the scheduler (apps/api/app/cron/
 * routines) calls, not a second implementation.
 */
const AutomationsPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const routines = await db.routine.findMany({
    orderBy: { createdAt: "desc" },
    include: { runs: { orderBy: { triggeredAt: "desc" }, take: 1 } },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Automações</h1>
        <p className="text-muted-foreground">
          {routines.length} rotina(s) — RoutineConfig, SPEC-ROUTINES-001.
        </p>
      </div>

      {routines.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma rotina configurada</CardTitle>
            <CardDescription>
              Rotinas são criadas via seed/configuração — não há formulário de
              criação ainda.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        routines.map((routine) => {
          const config = routineConfigSchema.safeParse(routine.config);
          const lastRun = routine.runs[0];
          return (
            <Card key={routine.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{routine.name}</CardTitle>
                  <Badge
                    variant={
                      routine.status === "ENABLED" ? "secondary" : "outline"
                    }
                  >
                    {routine.status}
                  </Badge>
                </div>
                <CardDescription>
                  {config.success
                    ? config.data.trigger.schedule
                    : "config inválida"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4 text-sm">
                <div>
                  {lastRun ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          RUN_STATUS_VARIANT[lastRun.status] ?? "outline"
                        }
                      >
                        {lastRun.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        {lastRun.triggeredAt.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Nunca executada.
                    </span>
                  )}
                </div>
                {routine.status === "ENABLED" && (
                  <RunRoutineButton routineId={routine.id} />
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default AutomationsPage;
