import { rankEligibleTasks } from "@repo/application";
import type { Deliverable, Task } from "@repo/database";
import { forWorkspace } from "@repo/database";
import type {
  PrismaA4Payload,
  PrismaCalendarDay,
  PrismaKpi,
  PrismaResultItem,
} from "../types";

const WEEK_DAYS = 7;
const RESULT_ITEMS = 4;

export type Prisma7dResult =
  | { kind: "OK"; payload: PrismaA4Payload }
  | { kind: "INSUFFICIENT_DATA"; reason: string };

const isSameUtcDay = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

const buildCalendarDays = (
  now: Date,
  deliverablesInWindow: readonly Deliverable[],
  wipTaskTitle: string | undefined
): PrismaA4Payload["calendar"]["days"] => {
  const days: PrismaCalendarDay[] = [];
  for (let i = 0; i < WEEK_DAYS; i++) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + i);
    const dueThatDay = deliverablesInWindow.find(
      (d) => d.dueDate && isSameUtcDay(d.dueDate, date)
    );
    days.push({
      number: String(i + 1).padStart(2, "0"),
      weekday: date.toLocaleDateString("pt-BR", { weekday: "short" }),
      date: date.toLocaleDateString("pt-BR"),
      title: dueThatDay ? dueThatDay.title : "Sem entrega vinculada",
      focus: dueThatDay ? "Entregável" : "—",
      track1: i === 0 ? (wipTaskTitle ?? "—") : "—",
      track2: "—",
    });
  }
  return days as unknown as PrismaA4Payload["calendar"]["days"];
};

const buildResultItems = (
  doneRecent: readonly Task[]
): PrismaA4Payload["result"]["items"] => {
  const items: PrismaResultItem[] = [];
  for (let i = 0; i < RESULT_ITEMS; i++) {
    const task = doneRecent[i];
    items.push(
      task
        ? { title: task.title, description: "Concluída.", status: "DONE" }
        : { title: "Sem entrega adicional", description: "—", status: "N/A" }
    );
  }
  return items as unknown as PrismaA4Payload["result"]["items"];
};

const buildKpis = (
  percent: number,
  done: number,
  total: number,
  deliverablesDueSoon: number,
  blocked: number,
  evidenceCount: number
): PrismaA4Payload["epic"]["kpis"] => {
  const kpis: PrismaKpi[] = [
    { label: "Progresso", value: `${percent}%`, caption: `${done}/${total}` },
    {
      label: "Entregáveis no prazo",
      value: String(deliverablesDueSoon),
      caption: "próximos 7 dias",
    },
    {
      label: "Bloqueios",
      value: String(blocked),
      caption: "tarefas bloqueadas",
    },
    {
      label: "Evidências",
      value: String(evidenceCount),
      caption: "registradas",
    },
  ];
  return kpis as unknown as PrismaA4Payload["epic"]["kpis"];
};

/**
 * prisma_7d projection (M07-T04, projections.md). "Use somente quando
 * houver dados suficientes para sete dias ou quando o usuário
 * autorizar" — the gate: without at least one Deliverable due in the
 * next 7 days, this returns INSUFFICIENT_DATA rather than fabricating
 * a week's worth of content, unless the caller passes
 * `authorized: true`. Once it proceeds, individual days/slots with no
 * real signal get an honest "sem dado" marker (a real statement that
 * nothing exists) rather than an invented title — never a raw
 * placeholder, never made-up content.
 */
export const prisma7d = async (
  workspaceId: string,
  options?: { readonly authorized?: boolean; readonly projectId?: string }
): Promise<Prisma7dResult> => {
  const db = forWorkspace(workspaceId);
  const projectId = options?.projectId;
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + WEEK_DAYS);
  const taskWhere = projectId ? { projectId } : {};

  const [
    project,
    deliverablesInWindow,
    grouped,
    evidenceCount,
    wipTask,
    doneRecent,
    ranked,
  ] = await Promise.all([
    projectId
      ? db.project.findUnique({ where: { id: projectId } })
      : Promise.resolve(null),
    db.deliverable.findMany({
      where: { ...taskWhere, dueDate: { gte: now, lt: weekEnd } },
      orderBy: { dueDate: "asc" },
    }),
    db.task.groupBy({
      where: taskWhere,
      by: ["state"],
      _count: { state: true },
    }),
    db.evidence.count(),
    db.task.findFirst({ where: { ...taskWhere, state: "DOING" } }),
    db.task.findMany({
      where: { ...taskWhere, state: "DONE" },
      orderBy: { updatedAt: "desc" },
      take: RESULT_ITEMS,
    }),
    rankEligibleTasks(workspaceId),
  ]);

  if (deliverablesInWindow.length === 0 && !options?.authorized) {
    return {
      kind: "INSUFFICIENT_DATA",
      reason:
        'Nenhum entregável com prazo nos próximos 7 dias — autorize explicitamente (authorized: true) para planejar a semana mesmo assim (projections.md: "ou quando o usuário autorizar").',
    };
  }

  const total = grouped.reduce((sum, g) => sum + g._count.state, 0);
  const done = grouped.find((g) => g.state === "DONE")?._count.state ?? 0;
  const blocked = grouped.find((g) => g.state === "BLOCKED")?._count.state ?? 0;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const rankedInScope = projectId
    ? ranked.filter((r) => r.task.projectId === projectId)
    : ranked;
  const lastDone = doneRecent[0];
  const nextActionTitle = rankedInScope[0]?.task.title;

  const payload: PrismaA4Payload = {
    doc: {
      topEyebrow: "EXECUTAR · Prisma 7D",
      periodShort: `${now.toLocaleDateString("pt-BR")}–${weekEnd.toLocaleDateString("pt-BR")}`,
      trace: `workspace:${workspaceId.slice(0, 8)}`,
    },
    epic: {
      title: project?.name ?? "Workspace",
      number: (project?.id ?? workspaceId).slice(0, 8),
      state: percent >= 100 ? "CONCLUÍDO" : "EM ANDAMENTO",
      progressPct: `${percent}%`,
      eyebrow: "Prisma 7D",
      description: `${total} tarefa(s), ${done} concluída(s).`,
      intentLabel: "Intenção",
      intentTitle: "Foco da semana",
      intentText: nextActionTitle ?? "Sem foco definido para a semana.",
      kpis: buildKpis(
        percent,
        done,
        total,
        deliverablesInWindow.length,
        blocked,
        evidenceCount
      ),
    },
    calendar: {
      title: "Semana operacional",
      eyebrow: "Prisma 7D",
      weekId: now.toISOString().slice(0, 10),
      period: `${now.toLocaleDateString("pt-BR")} – ${weekEnd.toLocaleDateString("pt-BR")}`,
      days: buildCalendarDays(now, deliverablesInWindow, wipTask?.title),
    },
    result: {
      title: "Resultados",
      eyebrow: "Prisma 7D",
      meta: `${doneRecent.length} concluída(s) recentemente`,
      heroTag: "Destaque",
      heroTitle: lastDone?.title ?? "Sem entrega concluída",
      heroDescription: lastDone
        ? "Concluída — evidência conforme registro."
        : "Sem evidência registrada.",
      heroStateLabel: "Estado",
      heroStateValue: lastDone?.state ?? "N/A",
      items: buildResultItems(doneRecent),
      nextLabel: "Próximo",
      nextValue: nextActionTitle ?? "Nenhuma ação elegível",
    },
  };

  return { kind: "OK", payload };
};
