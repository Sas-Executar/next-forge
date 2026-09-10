import { InsufficientRoleError } from "@repo/auth/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@repo/auth/server", async () => {
  const actual =
    await vi.importActual<typeof import("@repo/auth/server")>(
      "@repo/auth/server"
    );
  return { ...actual, requireRole: vi.fn() };
});
vi.mock("@repo/database", () => ({ database: {}, forWorkspace: vi.fn() }));
vi.mock("@repo/mapa-os", () => ({
  mapaOperacional: vi.fn(),
  agoraProximoDepois: vi.fn(),
  statusTerminal: vi.fn(),
  prisma7d: vi.fn(),
}));

describe("GET /mapa-os", () => {
  beforeEach(() => vi.clearAllMocks());

  test("rejects a caller without at least MEMBER role", async () => {
    const { requireRole } = await import("@repo/auth/server");
    vi.mocked(requireRole).mockRejectedValueOnce(
      new InsufficientRoleError("MEMBER")
    );

    const { GET } = await import("../app/mapa-os/route");
    const response = await GET(new Request("http://localhost/mapa-os"));

    expect(response.status).toBe(403);
  });

  test("rejects an unknown projection", async () => {
    const { requireRole } = await import("@repo/auth/server");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });

    const { GET } = await import("../app/mapa-os/route");
    const response = await GET(
      new Request("http://localhost/mapa-os?projection=not-real")
    );

    expect(response.status).toBe(400);
  });

  test("defaults to mapa_operacional and returns its real shape", async () => {
    const { requireRole } = await import("@repo/auth/server");
    const { mapaOperacional } = await import("@repo/mapa-os");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });
    vi.mocked(mapaOperacional).mockResolvedValueOnce({ fake: true } as any);

    const { GET } = await import("../app/mapa-os/route");
    const response = await GET(new Request("http://localhost/mapa-os"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      projection: "mapa_operacional",
      data: { fake: true },
    });
    expect(mapaOperacional).toHaveBeenCalledWith("workspace-1", undefined);
  });

  test("passes prisma_7d's INSUFFICIENT_DATA result through as real JSON, not an error", async () => {
    const { requireRole } = await import("@repo/auth/server");
    const { prisma7d } = await import("@repo/mapa-os");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });
    vi.mocked(prisma7d).mockResolvedValueOnce({
      kind: "INSUFFICIENT_DATA",
      reason: "sem entregável na janela",
    });

    const { GET } = await import("../app/mapa-os/route");
    const response = await GET(
      new Request("http://localhost/mapa-os?projection=prisma_7d")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      kind: "INSUFFICIENT_DATA",
      reason: "sem entregável na janela",
    });
  });
});
