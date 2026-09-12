import {
  InsufficientRoleError,
  NoActiveOrganizationError,
  requireRole,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import { listEnabledSymbols } from "@repo/scanner/server";
import { NextResponse } from "next/server";

/**
 * Returns this workspace's enabled VisualSymbol registry (REQ-SCAN-003
 * "manter registry local de símbolos e embeddings" — apps/mobile's own
 * on-device cache syncs from this). Embeddings serialize as plain
 * number[][] over JSON (Float32Array isn't directly JSON-transportable)
 * — a few hundred floats per reference image, trivial payload size.
 */
export const GET = async (): Promise<Response> => {
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

  const symbols = await listEnabledSymbols(workspaceId);

  return NextResponse.json({
    symbols: symbols.map((symbol) => ({
      symbolId: symbol.symbolId,
      semantic: symbol.semantic,
      command: symbol.command,
      enabled: symbol.enabled,
      embeddings: symbol.embeddings.map((e) => Array.from(e)),
    })),
  });
};
