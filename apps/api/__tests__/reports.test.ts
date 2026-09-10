import { InsufficientRoleError } from "@repo/auth/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@repo/auth/server", async () => {
  const actual =
    await vi.importActual<typeof import("@repo/auth/server")>(
      "@repo/auth/server"
    );
  return { ...actual, requireRole: vi.fn() };
});
vi.mock("@repo/database", () => ({
  forWorkspace: vi.fn(),
  Prisma: { JsonNull: Symbol("JsonNull") },
}));
vi.mock("@repo/reports", () => ({ buildStatusReport: vi.fn() }));

describe("GET /reports", () => {
  beforeEach(() => vi.clearAllMocks());

  test("rejects a caller without at least MEMBER role", async () => {
    const { requireRole } = await import("@repo/auth/server");
    vi.mocked(requireRole).mockRejectedValueOnce(
      new InsufficientRoleError("MEMBER")
    );

    const { GET } = await import("../app/reports/route");
    const response = await GET();

    expect(response.status).toBe(403);
  });

  test("returns the report list's real shape", async () => {
    const { requireRole } = await import("@repo/auth/server");
    const { forWorkspace } = await import("@repo/database");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });
    const db = {
      statusReport: {
        findMany: vi.fn().mockResolvedValueOnce([
          {
            id: "r1",
            generatedAt: new Date("2026-01-01T00:00:00.000Z"),
            status: "OK",
            progress: { project_percent: 50 },
            properties: { problem: "x" },
          },
        ]),
      },
    };
    vi.mocked(forWorkspace).mockReturnValueOnce(db as any);

    const { GET } = await import("../app/reports/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0].status).toBe("OK");
  });
});

describe("POST /reports/generate", () => {
  beforeEach(() => vi.clearAllMocks());

  test("rejects a caller without an active workspace", async () => {
    const { requireRole, NoActiveOrganizationError } = await import(
      "@repo/auth/server"
    );
    vi.mocked(requireRole).mockRejectedValueOnce(
      new NoActiveOrganizationError()
    );

    const { POST } = await import("../app/reports/generate/route");
    const response = await POST(
      new Request("http://localhost/reports/generate", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(409);
  });

  test("builds and persists a real StatusReport", async () => {
    const { requireRole } = await import("@repo/auth/server");
    const { forWorkspace } = await import("@repo/database");
    const { buildStatusReport } = await import("@repo/reports");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });
    vi.mocked(buildStatusReport).mockResolvedValueOnce({
      report_id: "r1",
      project_id: null,
      status: "OK",
      progress: {},
      triptych: {},
      now: null,
      properties: {},
      evidence_refs: [],
      gaps: [],
    } as any);
    const created = { id: "r1" };
    const db = {
      statusReport: { create: vi.fn().mockResolvedValueOnce(created) },
      auditEvent: { create: vi.fn() },
    };
    vi.mocked(forWorkspace).mockReturnValueOnce(db as any);

    const { POST } = await import("../app/reports/generate/route");
    const response = await POST(
      new Request("http://localhost/reports/generate", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, report: created });
  });
});
