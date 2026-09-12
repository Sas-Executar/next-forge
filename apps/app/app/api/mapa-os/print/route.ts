import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { PrismaFitError, populatePrismaA4, prisma7d } from "@repo/mapa-os";
import { emitBusinessEvent } from "@repo/observability/business-events";

/**
 * Print/export surface for the prisma_7d projection (M07-T05). Returns
 * the real populated Prisma A4 V4 HTML — designed for the browser's
 * native print-to-PDF (the template's own `@page{size:A4}` CSS) rather
 * than a server-side headless-render step. Genuine, disclosed
 * simplification: this repo has no Puppeteer/Playwright PDF pipeline
 * wired yet, and fabricating PDF bytes from nothing would be worse than
 * being explicit about using the browser's own print dialog.
 */
export const GET = async (req: Request) => {
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

  const url = new URL(req.url);
  const authorized = url.searchParams.get("authorized") === "true";
  const projectId = url.searchParams.get("projectId") ?? undefined;

  const result = await prisma7d(workspaceId, { authorized, projectId });
  if (result.kind === "INSUFFICIENT_DATA") {
    return new Response(result.reason, { status: 409 });
  }

  try {
    const html = populatePrismaA4(result.payload);
    // M15-T02 (OBS-BIZ-001 §4) — fires only once the artifact is
    // actually produced (past PrismaFitError), not merely requested.
    await emitBusinessEvent(workspaceId, {
      eventName: "product.mapa_os_generated",
      component: "api/mapa-os/print",
      outcome: "success",
      metadata: { projectId: projectId ?? null, authorized },
    });
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    if (error instanceof PrismaFitError) {
      return new Response(error.message, { status: 422 });
    }
    throw error;
  }
};
