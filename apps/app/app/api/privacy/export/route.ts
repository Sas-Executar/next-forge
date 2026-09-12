import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { exportWorkspaceData } from "@/app/actions/privacy/export";

/**
 * M16-T03 — turns `exportWorkspaceData()` into an actual downloadable
 * file (`Content-Disposition: attachment`), the concrete form LGPD
 * portability needs — a JSON object returned from a server action alone
 * has no real "download my data" affordance in this app (no client-side
 * blob-save wiring exists here to turn one into a file). Same
 * requireRole('OWNER') gate as the action itself; the 401/403/409
 * mapping mirrors apps/app/app/api/mapa-os/print/route.ts's own pattern
 * for the same three auth failure modes.
 */
export const GET = async (): Promise<Response> => {
  try {
    const result = await exportWorkspaceData();
    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="executar-export-${result.workspace.id}.json"`,
      },
    });
  } catch (error) {
    if (
      error instanceof NoActiveOrganizationError ||
      error instanceof WorkspaceNotFoundError
    ) {
      return new Response("No active workspace", { status: 409 });
    }
    if (error instanceof InsufficientRoleError) {
      return new Response("Forbidden — OWNER role required", {
        status: 403,
      });
    }
    throw error;
  }
};
