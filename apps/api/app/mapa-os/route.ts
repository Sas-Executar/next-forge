import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import {
  agoraProximoDepois,
  mapaOperacional,
  prisma7d,
  statusTerminal,
} from "@repo/mapa-os";
import { NextResponse } from "next/server";

const PROJECTION_IDS = [
  "mapa_operacional",
  "agora_proximo_depois",
  "status_terminal",
  "prisma_7d",
] as const;
type ProjectionId = (typeof PROJECTION_IDS)[number];

/**
 * M21 — apps/mobile's network boundary for the 4 Mapa-OS projections
 * (mirrors apps/app's /mapa-os page's own 4-way dispatch, just
 * server-side and parameterized by a query param instead of 4 JSX
 * branches). Unlike the web page, an unknown `projection` value is a
 * 400 rather than a silent fallback — a mobile client that asked for a
 * specific projection shouldn't silently get a different one.
 */
export const GET = async (request: Request): Promise<Response> => {
  let workspaceId: string;
  try {
    const { workspace } = await requireRole("MEMBER");
    workspaceId = workspace.id;
  } catch (error) {
    if (
      error instanceof NoActiveOrganizationError ||
      error instanceof WorkspaceNotFoundError
    ) {
      return new Response("No active workspace", { status: 409 });
    }
    if (error instanceof InsufficientRoleError) {
      return new Response("Forbidden", { status: 403 });
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const rawProjection = searchParams.get("projection");
  const projection: ProjectionId = rawProjection
    ? (rawProjection as ProjectionId)
    : "mapa_operacional";
  if (rawProjection && !PROJECTION_IDS.includes(projection)) {
    return NextResponse.json(
      { message: "Invalid projection", ok: false },
      { status: 400 }
    );
  }

  const projectId = searchParams.get("projectId") ?? undefined;
  const authorized = searchParams.get("authorized") === "true";

  switch (projection) {
    case "mapa_operacional":
      return NextResponse.json({
        projection,
        data: await mapaOperacional(workspaceId, projectId),
      });
    case "agora_proximo_depois":
      return NextResponse.json({
        projection,
        data: await agoraProximoDepois(workspaceId, projectId),
      });
    case "status_terminal":
      return NextResponse.json({
        projection,
        data: await statusTerminal(workspaceId, projectId),
      });
    case "prisma_7d":
      return NextResponse.json({
        projection,
        // prisma7d's own { kind: "INSUFFICIENT_DATA", reason } result is
        // real, honest JSON — not an error to catch, passed through as-is.
        data: await prisma7d(workspaceId, { authorized, projectId }),
      });
    default: {
      const exhaustive: never = projection;
      throw new Error(`Unhandled projection: ${exhaustive as string}`);
    }
  }
};
