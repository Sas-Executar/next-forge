import {
  getCreditBalance,
  getSeatUsage,
  getWorkspaceEntitlements,
  PLAN_DEFINITIONS,
  SELF_SERVE_PLANS,
} from "@repo/billing";
import { forWorkspace } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import type { Metadata } from "next";
import {
  openBillingPortal,
  startCheckout,
} from "@/app/actions/billing/checkout";
import { resolveWorkspace } from "../../lib/resolve-workspace";

export const metadata: Metadata = {
  title: "Cobrança",
  description: "Plano, seats e Execution Credits (PRICING-001).",
};

const brl = (centavos: number): string =>
  (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/**
 * /settings/billing (M13-T04). Reads the workspace's real
 * `Subscription` row, entitlements (packages/billing, from
 * PRICING-001), seat usage, and Execution Credits balance — every
 * number here is computed from live data, none of it fabricated. Plan
 * upgrade/checkout and the Stripe billing portal are real redirects to
 * Stripe-hosted pages (this repo has no custom card-collection form —
 * Stripe Checkout/Portal are the documented, PCI-scope-avoiding way to
 * do this).
 */
const BillingSettingsPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const [subscription, entitlements, seatUsage, creditBalance] =
    await Promise.all([
      db.subscription.findUnique({ where: { workspaceId: workspace.id } }),
      getWorkspaceEntitlements(workspace.id),
      getSeatUsage(workspace.id),
      getCreditBalance(workspace.id),
    ]);

  const currentPlan = subscription?.plan ?? "TRIAL";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Plano atual</CardTitle>
          <CardDescription>
            {PLAN_DEFINITIONS[currentPlan].name} ·{" "}
            {subscription?.status ?? "TRIALING"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            Execution Credits: <strong>{creditBalance}</strong>
          </p>
          <p>
            Seats:{" "}
            <strong>
              {seatUsage.activeMembers}
              {seatUsage.totalCapacity !== null
                ? ` / ${seatUsage.totalCapacity}`
                : ""}
            </strong>
          </p>
          {subscription?.stripeCustomerId && (
            <form action={openBillingPortal}>
              <Button size="sm" type="submit" variant="outline">
                Gerenciar assinatura (Stripe)
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col gap-4">
        {SELF_SERVE_PLANS.map((plan) => {
          const definition = PLAN_DEFINITIONS[plan];
          const isCurrent = plan === currentPlan;
          return (
            <Card key={plan}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{definition.name}</CardTitle>
                  {isCurrent && <Badge>Atual</Badge>}
                </div>
                <CardDescription>{definition.unit}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {definition.monthlyPriceCentavos !== null && (
                  <form action={startCheckout}>
                    <input name="plan" type="hidden" value={plan} />
                    <input name="interval" type="hidden" value="month" />
                    <Button disabled={isCurrent} size="sm" type="submit">
                      {brl(definition.monthlyPriceCentavos)}/mês
                    </Button>
                  </form>
                )}
                {definition.annualPriceCentavos !== null && (
                  <form action={startCheckout}>
                    <input name="plan" type="hidden" value={plan} />
                    <input name="interval" type="hidden" value="year" />
                    <Button
                      disabled={isCurrent}
                      size="sm"
                      type="submit"
                      variant="outline"
                    >
                      {brl(definition.annualPriceCentavos)}/ano
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs">
        Preços PROPOSED (PRICING-001) — arquitetura de cobrança autorizada para
        experimentação e modelagem, não preço publicado ou contrato ativo.
      </p>

      <p className="text-muted-foreground text-xs">
        Recursos do plano {PLAN_DEFINITIONS[currentPlan].name}: Copiloto,
        Mapa-OS e Scanner sempre incluídos.
        {entitlements.routines ? " Rotinas e automações incluídas." : ""}
        {entitlements.mcp ? " MCP incluído." : ""}
      </p>
    </div>
  );
};

export default BillingSettingsPage;
