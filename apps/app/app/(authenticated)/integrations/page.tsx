import { forWorkspace, type IntegrationConnection } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Metadata } from "next";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { ConnectOAuthButton } from "./connect-oauth-button";
import { DisconnectButton } from "./disconnect-button";
import { WhatsAppConnectForm } from "./whatsapp-connect-form";

export const metadata: Metadata = {
  title: "Integrações",
  description:
    "IntegrationConnection — WhatsApp, Gmail, Outlook (PRD-OMNI-001).",
};

const STATUS_VARIANT: Record<
  IntegrationConnection["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  CONNECTED: "secondary",
  PENDING: "outline",
  DISCONNECTED: "outline",
  ERROR: "destructive",
};

/**
 * /integrations (M11-T05/T06). Lists this workspace's
 * IntegrationConnection rows for the three channel providers wired this
 * milestone (WHATSAPP/GMAIL/OUTLOOK — GOOGLE_CALENDAR/OUTLOOK_CALENDAR
 * intentionally have no connect flow here, see calendar adapters'
 * own comments) with a real connect/disconnect action per provider.
 */
const IntegrationsPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const db = forWorkspace(workspace.id);

  const connections = await db.integrationConnection.findMany({
    where: { provider: { in: ["WHATSAPP", "GMAIL", "OUTLOOK"] } },
  });
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Integrações</h1>
        <p className="text-muted-foreground">
          Canais omnichannel conectados a este workspace (PRD-OMNI-001).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">WhatsApp</CardTitle>
              <CardDescription>
                Meta Cloud API — mensagens de entrega (M10 DeliveryRouter).
              </CardDescription>
            </div>
            {byProvider.get("WHATSAPP") && (
              <Badge
                variant={
                  STATUS_VARIANT[
                    byProvider.get("WHATSAPP")?.status ?? "PENDING"
                  ]
                }
              >
                {byProvider.get("WHATSAPP")?.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {byProvider.get("WHATSAPP")?.status === "CONNECTED" ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                phone_number_id: {byProvider.get("WHATSAPP")?.externalAccountId}
              </span>
              <DisconnectButton provider="WHATSAPP" />
            </div>
          ) : (
            <WhatsAppConnectForm />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Gmail</CardTitle>
              <CardDescription>
                OAuth 2.0 — leitura/envio de e-mail.
              </CardDescription>
            </div>
            {byProvider.get("GMAIL") && (
              <Badge
                variant={
                  STATUS_VARIANT[byProvider.get("GMAIL")?.status ?? "PENDING"]
                }
              >
                {byProvider.get("GMAIL")?.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          {byProvider.get("GMAIL")?.status === "CONNECTED" ? (
            <>
              <span className="text-muted-foreground">
                {byProvider.get("GMAIL")?.externalAccountId}
              </span>
              <DisconnectButton provider="GMAIL" />
            </>
          ) : (
            <ConnectOAuthButton
              href="/api/integrations/gmail/connect"
              label="Conectar Gmail"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Outlook</CardTitle>
              <CardDescription>
                Microsoft Graph — leitura/envio de e-mail.
              </CardDescription>
            </div>
            {byProvider.get("OUTLOOK") && (
              <Badge
                variant={
                  STATUS_VARIANT[byProvider.get("OUTLOOK")?.status ?? "PENDING"]
                }
              >
                {byProvider.get("OUTLOOK")?.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          {byProvider.get("OUTLOOK")?.status === "CONNECTED" ? (
            <>
              <span className="text-muted-foreground">
                {byProvider.get("OUTLOOK")?.externalAccountId}
              </span>
              <DisconnectButton provider="OUTLOOK" />
            </>
          ) : (
            <ConnectOAuthButton
              href="/api/integrations/outlook/connect"
              label="Conectar Outlook"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsPage;
