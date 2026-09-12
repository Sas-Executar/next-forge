import {
  PLAN_DEFINITIONS,
  PLAN_ENTITLEMENTS,
  SELF_SERVE_PLANS,
} from "@repo/billing/plans";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization";
import { createMetadata } from "@repo/seo/metadata";
import { Check, Minus, MoveRight, PhoneCall } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { env } from "@/env";

interface PricingProps {
  params: Promise<{
    locale: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: PricingProps): Promise<Metadata> => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return createMetadata(dictionary.web.pricing.meta);
};

const brl = (centavos: number): string =>
  (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const ALL_PLANS = ["TRIAL", ...SELF_SERVE_PLANS, "ENTERPRISE"] as const;

const FEATURE_ROWS: {
  readonly label: string;
  readonly key: keyof typeof PLAN_ENTITLEMENTS.SOLO;
}[] = [
  { label: "Copilot, Mapa-OS, Scanner", key: "coreExecutionSurface" },
  { label: "Routines & automations", key: "routines" },
  { label: "Remix (multi-project)", key: "remixMultiProject" },
  { label: "MCP", key: "mcp" },
  { label: "Advanced reports", key: "advancedReports" },
  { label: "Scanner symbol customization", key: "scannerSymbolCustomization" },
  { label: "WhatsApp channel", key: "whatsappChannel" },
  { label: "Organizational governance", key: "organizationalGovernance" },
];

/**
 * Rewritten (M14-T03): the stock Next Forge version hardcoded a fake
 * "Startup/Growth/Enterprise" table at a flat $40/month with generic
 * SSO/AI-Assistant/Version-Control feature rows unrelated to this
 * product. This reads the real plan/price/entitlement data
 * `packages/billing` built in M13 (`PLAN_DEFINITIONS`,
 * `PLAN_ENTITLEMENTS`, from `PRICING-001`) — the same source of truth
 * `/settings/billing` (apps/app) reads, via `@repo/billing/plans`'s
 * pure entry point so this public marketing page never needs
 * `DATABASE_URL`/`STRIPE_SECRET_KEY` just to render.
 *
 * `proposedNotice` (dictionary) is shown unconditionally — PRICING-001's
 * own governance status is explicit: these figures are PROPOSED, not
 * published as final commercial terms, and this page must not imply
 * otherwise.
 */
const Pricing = async ({ params }: PricingProps) => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);
  const copy = dictionary.web.pricing;

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex flex-col gap-2">
            <h2 className="max-w-xl text-center font-regular text-3xl tracking-tighter md:text-5xl">
              {copy.title}
            </h2>
            <p className="max-w-xl text-center text-lg text-muted-foreground leading-relaxed tracking-tight">
              {copy.description}
            </p>
          </div>

          <div className="mt-6 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col gap-2 rounded-md border p-6">
              <p className="text-2xl">{copy.trial.title}</p>
              <p className="text-muted-foreground text-sm">
                {copy.trial.description}
              </p>
              <p className="mt-8 text-muted-foreground text-sm">
                {copy.trial.unit}
              </p>
              <Button asChild className="mt-8 gap-4" variant="outline">
                <Link href={env.NEXT_PUBLIC_APP_URL}>
                  {copy.startTrial} <MoveRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {SELF_SERVE_PLANS.map((plan) => {
              const definition = PLAN_DEFINITIONS[plan];
              return (
                <div
                  className="flex flex-col gap-2 rounded-md border p-6"
                  key={plan}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-2xl">{definition.name}</p>
                    {plan === "PRO" && <Badge>Popular</Badge>}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {definition.unit}
                  </p>
                  <div className="mt-8 flex flex-col gap-1">
                    {definition.monthlyPriceCentavos !== null && (
                      <p className="text-xl">
                        <span className="text-4xl">
                          {brl(definition.monthlyPriceCentavos)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {copy.monthly}
                        </span>
                      </p>
                    )}
                    {definition.annualPriceCentavos !== null && (
                      <p className="text-muted-foreground text-sm">
                        {brl(definition.annualPriceCentavos)}
                        {copy.annual}
                      </p>
                    )}
                  </div>
                  <Button asChild className="mt-8 gap-4">
                    <Link href={env.NEXT_PUBLIC_APP_URL}>
                      {copy.startTrial} <MoveRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}

            <div className="flex flex-col gap-2 rounded-md border p-6">
              <p className="text-2xl">{copy.enterprise.title}</p>
              <p className="text-muted-foreground text-sm">
                {copy.enterprise.description}
              </p>
              <p className="mt-8 text-muted-foreground text-sm">
                {copy.enterprise.unit}
              </p>
              <Button asChild className="mt-8 gap-4" variant="outline">
                <Link href="/contact">
                  {copy.contactSales} <PhoneCall className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid w-full grid-cols-6 divide-x pt-10 text-left">
            <div className="col-span-6 px-3 py-4 lg:col-span-1 lg:px-6">
              <b>Features</b>
            </div>
            {ALL_PLANS.map((plan) => (
              <div className="hidden px-3 py-4 lg:block lg:px-6" key={plan}>
                {PLAN_DEFINITIONS[plan].name}
              </div>
            ))}
            {FEATURE_ROWS.map((row) => (
              <Fragment key={row.label}>
                <div className="col-span-6 px-3 py-4 lg:col-span-1 lg:px-6">
                  {row.label}
                </div>
                {ALL_PLANS.map((plan) => (
                  <div
                    className="flex justify-center px-3 py-1 md:px-6 md:py-4"
                    key={`${row.label}-${plan}`}
                  >
                    {PLAN_ENTITLEMENTS[plan][row.key] ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-center text-muted-foreground text-xs">
            {copy.proposedNotice}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
