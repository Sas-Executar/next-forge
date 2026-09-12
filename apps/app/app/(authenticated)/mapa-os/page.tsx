import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  agoraProximoDepois,
  mapaOperacional,
  prisma7d,
  statusTerminal,
} from "@repo/mapa-os";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { ProjectionToggle } from "./projection-toggle";

export const metadata: Metadata = {
  title: "Mapa-OS",
  description:
    "Analog Projection — artefato imprimível (SPEC-WORKSPACE-001 §2).",
};

const PROJECTION_IDS = [
  "mapa_operacional",
  "agora_proximo_depois",
  "status_terminal",
  "prisma_7d",
] as const;
type ProjectionId = (typeof PROJECTION_IDS)[number];

interface MapaOsPageProperties {
  readonly searchParams: Promise<{ projection?: string; authorized?: string }>;
}

/**
 * /mapa-os (M07-T05). "Se o usuário não escolher projeção, use
 * mapa_operacional" (SKILL.md) — default below matches. Every
 * projection is the real packages/mapa-os function reading live
 * workspace data (M07-T04); this page only renders whichever one is
 * selected via ?projection=.
 */
const MapaOsPage = async ({ searchParams }: MapaOsPageProperties) => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;
  const params = await searchParams;
  const projection: ProjectionId = PROJECTION_IDS.includes(
    params.projection as ProjectionId
  )
    ? (params.projection as ProjectionId)
    : "mapa_operacional";
  const authorized = params.authorized === "true";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Mapa-OS</h1>
        <p className="text-muted-foreground">
          Projeção analógica/imprimível da fonte canônica — não cria um segundo
          estado do projeto.
        </p>
      </div>

      <ProjectionToggle current={projection} />

      {projection === "mapa_operacional" && (
        <MapaOperacionalCard workspaceId={workspace.id} />
      )}
      {projection === "agora_proximo_depois" && (
        <AgoraProximoDepoisCard workspaceId={workspace.id} />
      )}
      {projection === "status_terminal" && (
        <StatusTerminalCard workspaceId={workspace.id} />
      )}
      {projection === "prisma_7d" && (
        <Prisma7dCard authorized={authorized} workspaceId={workspace.id} />
      )}
    </div>
  );
};

const MapaOperacionalCard = async ({
  workspaceId,
}: {
  workspaceId: string;
}) => {
  const view = await mapaOperacional(workspaceId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{view.position}</CardTitle>
        <CardDescription>
          {view.sustainedProgressPct}% concluído
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          <span className="text-muted-foreground">{view.evidenceQuestion}</span>{" "}
          {view.evidenceExists ? "Sim." : "Ainda não."}
        </p>
        <p>
          <span className="text-muted-foreground">Bloqueios:</span>{" "}
          {view.blockers.length > 0 ? view.blockers.join(", ") : "Nenhum."}
        </p>
        <p>
          <span className="text-muted-foreground">Próximo:</span>{" "}
          {view.proximo.length > 0 ? view.proximo.join(", ") : "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Depois:</span>{" "}
          {view.depois.length > 0 ? view.depois.join(", ") : "—"}
        </p>
      </CardContent>
    </Card>
  );
};

const AgoraProximoDepoisCard = async ({
  workspaceId,
}: {
  workspaceId: string;
}) => {
  const view = await agoraProximoDepois(workspaceId);
  const horizons = {
    agora: view.agora ? [view.agora] : [],
    proximo: view.proximo,
    depois: view.depois,
  } as const;

  return (
    <div className="flex flex-col gap-4">
      {(["agora", "proximo", "depois"] as const).map((horizon) => (
        <Card key={horizon}>
          <CardHeader>
            <CardTitle className="text-base capitalize">{horizon}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {horizons[horizon].length === 0 ? (
              <p className="text-muted-foreground">Nada.</p>
            ) : (
              horizons[horizon].map((item) => (
                <p key={item.title}>
                  {item.title} — {item.state}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const StatusTerminalCard = async ({ workspaceId }: { workspaceId: string }) => {
  const view = await statusTerminal(workspaceId);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{view.header}</CardTitle>
          {view.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <CardDescription>{view.position}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p>
          <span className="text-muted-foreground">Problema:</span>{" "}
          {view.threePN.problem}
        </p>
        <p>
          <span className="text-muted-foreground">Processo:</span>{" "}
          {view.threePN.process}
        </p>
        <p>
          <span className="text-muted-foreground">Progresso:</span>{" "}
          {view.threePN.progress}
        </p>
        <p>
          <span className="text-muted-foreground">Próximas:</span>{" "}
          {view.threePN.next.join(" · ") || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Risco:</span> {view.risk}
        </p>
        <p>
          <span className="text-muted-foreground">Prevenção:</span>{" "}
          {view.prevention}
        </p>
        <p>
          <span className="text-muted-foreground">Evidências:</span>{" "}
          {view.evidenceCount}
        </p>
      </CardContent>
    </Card>
  );
};

const Prisma7dCard = async ({
  workspaceId,
  authorized,
}: {
  workspaceId: string;
  authorized: boolean;
}) => {
  const result = await prisma7d(workspaceId, { authorized });

  if (result.kind === "INSUFFICIENT_DATA") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados insuficientes para os 7 dias</CardTitle>
          <CardDescription>{result.reason}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            className="text-primary text-sm underline"
            href="/mapa-os?projection=prisma_7d&authorized=true"
          >
            Autorizar mesmo assim
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { payload } = result;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{payload.epic.title}</CardTitle>
        <CardDescription>
          {payload.epic.progressPct} · {payload.calendar.period}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="grid grid-cols-4 gap-2">
          {payload.epic.kpis.map((kpi) => (
            <div className="rounded border p-2" key={kpi.label}>
              <p className="text-muted-foreground text-xs">{kpi.label}</p>
              <p className="font-semibold">{kpi.value}</p>
            </div>
          ))}
        </div>
        <p>
          <span className="text-muted-foreground">Destaque:</span>{" "}
          {payload.result.heroTitle}
        </p>
        <p>
          <span className="text-muted-foreground">Próximo:</span>{" "}
          {payload.result.nextValue}
        </p>
        <Link
          className="text-primary text-sm underline"
          href={`/api/mapa-os/print${authorized ? "?authorized=true" : ""}`}
          target="_blank"
        >
          Abrir Prisma A4 para impressão/exportação →
        </Link>
      </CardContent>
    </Card>
  );
};

export default MapaOsPage;
