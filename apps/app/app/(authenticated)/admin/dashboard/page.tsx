import { requireRole } from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { ECONOMIC_GUARDRAILS } from "@repo/observability/metrics";
import { getWorkspaceEconomicSnapshot } from "@repo/observability/workspace-metrics";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard econômico",
  description: "OBS-BIZ-001 §9 — MRR, AI COGS, contribution, guardrails.",
};

const brl = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (value: number | null): string =>
  value === null ? "—" : `${(value * 100).toFixed(1)}%`;

/**
 * /admin/dashboard (M15-T04). OBS-BIZ-001 §9's own dashboard list is
 * platform-wide (MRR/ARR across every paid account); this is
 * deliberately scoped to the caller's own workspace instead —
 * `getWorkspaceEconomicSnapshot`'s own comment explains why a true
 * cross-tenant aggregate isn't built here. Gated to OWNER, same as
 * /settings/billing (M13) — this shows the workspace's own recurring-
 * revenue commitment and cost data, not a platform operator console
 * (no such role exists in this codebase).
 */
const AdminDashboardPage = async () => {
  const { workspace } = await requireRole("OWNER");

  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const [snapshot, recentEvents] = await Promise.all([
    getWorkspaceEconomicSnapshot(workspace.id, periodStart, periodEnd),
    forWorkspace(workspace.id).telemetryEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 20,
    }),
  ]);

  const guardrail =
    snapshot.plan === "SOLO" ||
    snapshot.plan === "PRO" ||
    snapshot.plan === "BUSINESS"
      ? ECONOMIC_GUARDRAILS[snapshot.plan]
      : null;
  const aiCogsToRevenue =
    snapshot.mrrCentavos > 0
      ? snapshot.aiCogsBrl / (snapshot.mrrCentavos / 100)
      : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Dashboard econômico</h1>
        <p className="text-muted-foreground text-sm">
          {periodStart.toLocaleDateString("pt-BR")} –{" "}
          {periodEnd.toLocaleDateString("pt-BR")} · plano {snapshot.plan}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>MRR (este workspace)</CardDescription>
            <CardTitle>{brl(snapshot.mrrCentavos / 100)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>ARR (este workspace)</CardDescription>
            <CardTitle>{brl(snapshot.arrCentavos / 100)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>AI COGS (período)</CardDescription>
            <CardTitle>{brl(snapshot.aiCogsBrl)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Canais — custo (período)</CardDescription>
            <CardTitle>{brl(snapshot.channelCogsBrl)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Contribution (período)</CardDescription>
            <CardTitle>
              {snapshot.contributionBrl === null
                ? "—"
                : brl(snapshot.contributionBrl)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Contribution margin</CardDescription>
            <CardTitle>{pct(snapshot.contributionMargin)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {guardrail && (
        <Card>
          <CardHeader>
            <CardTitle>Guardrails ({snapshot.plan}) — PROPOSED</CardTitle>
            <CardDescription>
              OBS-BIZ-001 §7 / OBS-006 §4 — não são benchmarks observados do
              EXECUTAR, são limites de planejamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              AI COGS / receita: <strong>{pct(aiCogsToRevenue)}</strong> (limite{" "}
              {pct(guardrail.aiCogsToRevenueMax)})
            </p>
            <p>
              Contribution margin mínima:{" "}
              <strong>{pct(guardrail.contributionMarginMin)}</strong>
            </p>
            <p>
              CAC payback máximo:{" "}
              <strong>{guardrail.cacPaybackMonthsMax} meses</strong> — sem fonte
              de CAC real ainda (GAP).
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Eventos recentes</CardTitle>
          <CardDescription>
            Últimos 20 eventos OBS-BIZ-001 registrados neste workspace
            (TelemetryEvent).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {recentEvents.map((event) => (
                <li className="flex justify-between gap-4" key={event.id}>
                  <span>{event.eventName}</span>
                  <span className="text-muted-foreground">
                    {event.occurredAt.toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Não conciliado com billing/provider real (OBS-BIZ-001 §10) — estes
        números são <code>observed_unreconciled</code>: o custo/receita local,
        sem comparação com Stripe/OpenAI. Não incluem tax provision, taxas de
        pagamento nem custo de infraestrutura (GAPs disclosed em
        packages/observability/workspace-metrics.ts).
      </p>
    </div>
  );
};

export default AdminDashboardPage;
