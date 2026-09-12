import "server-only";

import {
  agoraProximoDepois,
  mapaOperacional,
  PrismaFitError,
  populatePrismaA4,
  prisma7d,
  statusTerminal,
} from "@repo/mapa-os";
import type { McpToolContext } from "../context";

const PROJECTION_IDS = [
  "mapa_operacional",
  "agora_proximo_depois",
  "status_terminal",
  "prisma_7d",
] as const;
export type MapaProjectionId = (typeof PROJECTION_IDS)[number];

export type MapaGenerateResult =
  | {
      readonly kind: "PROJECTION";
      readonly projection: MapaProjectionId;
      readonly data: unknown;
    }
  | { readonly kind: "PRISMA_A4_HTML"; readonly html: string }
  | { readonly kind: "INSUFFICIENT_DATA"; readonly reason: string }
  | { readonly kind: "FIT_ERROR"; readonly issues: readonly string[] };

/**
 * `mapa.generate` (M12-T02) — the same 4 real projections `/mapa-os`
 * (M07-T05) renders, reused verbatim, plus `prisma_7d`'s populated HTML
 * export (mirroring apps/app's `/api/mapa-os/print` route) when the
 * caller asks for `renderHtml: true`. "Se não couber sem perda, retorne
 * erro de fit" (SKILL.md) is preserved as-is: a `PrismaFitError` comes
 * back as a structured `FIT_ERROR` result, never a silently truncated
 * template.
 */
export const mapaGenerate = async (
  ctx: McpToolContext,
  input: {
    readonly projection: MapaProjectionId;
    readonly projectId?: string;
    readonly authorized?: boolean;
    readonly renderHtml?: boolean;
  }
): Promise<MapaGenerateResult> => {
  if (input.projection === "prisma_7d") {
    const result = await prisma7d(ctx.workspaceId, {
      authorized: input.authorized ?? false,
      projectId: input.projectId,
    });
    if (result.kind === "INSUFFICIENT_DATA") {
      return { kind: "INSUFFICIENT_DATA", reason: result.reason };
    }
    if (!input.renderHtml) {
      return { kind: "PROJECTION", projection: "prisma_7d", data: result };
    }
    try {
      const html = populatePrismaA4(result.payload);
      return { kind: "PRISMA_A4_HTML", html };
    } catch (error) {
      if (error instanceof PrismaFitError) {
        return { kind: "FIT_ERROR", issues: error.issues };
      }
      throw error;
    }
  }

  if (input.projection === "mapa_operacional") {
    const data = await mapaOperacional(ctx.workspaceId, input.projectId);
    return { kind: "PROJECTION", projection: "mapa_operacional", data };
  }
  if (input.projection === "agora_proximo_depois") {
    const data = await agoraProximoDepois(ctx.workspaceId, input.projectId);
    return { kind: "PROJECTION", projection: "agora_proximo_depois", data };
  }
  const data = await statusTerminal(ctx.workspaceId, input.projectId);
  return { kind: "PROJECTION", projection: "status_terminal", data };
};
