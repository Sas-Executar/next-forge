import { InsufficientRoleError } from "@repo/auth/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@repo/auth/server", async () => {
  const actual =
    await vi.importActual<typeof import("@repo/auth/server")>(
      "@repo/auth/server"
    );
  return { ...actual, requireRole: vi.fn() };
});
vi.mock("@repo/database", () => ({ forWorkspace: vi.fn() }));

describe("GET /projects", () => {
  beforeEach(() => vi.clearAllMocks());

  test("rejects a caller without at least MEMBER role", async () => {
    const { requireRole } = await import("@repo/auth/server");
    vi.mocked(requireRole).mockRejectedValueOnce(
      new InsufficientRoleError("MEMBER")
    );

    const { GET } = await import("../app/projects/route");
    const response = await GET();

    expect(response.status).toBe(403);
  });

  test("returns the project list flattened with task/deliverable counts", async () => {
    const { requireRole } = await import("@repo/auth/server");
    const { forWorkspace } = await import("@repo/database");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });
    const db = {
      project: {
        findMany: vi.fn().mockResolvedValueOnce([
          {
            id: "p1",
            name: "Projeto 1",
            description: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            _count: { tasks: 3, deliverables: 1 },
          },
        ]),
      },
    };
    vi.mocked(forWorkspace).mockReturnValueOnce(db as any);

    const { GET } = await import("../app/projects/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.projects).toEqual([
      {
        id: "p1",
        name: "Projeto 1",
        description: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        taskCount: 3,
        deliverableCount: 1,
      },
    ]);
  });
});
