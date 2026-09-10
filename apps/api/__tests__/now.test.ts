import { InsufficientRoleError } from "@repo/auth/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@repo/auth/server", async () => {
  const actual =
    await vi.importActual<typeof import("@repo/auth/server")>(
      "@repo/auth/server"
    );
  return { ...actual, requireRole: vi.fn() };
});
vi.mock("@repo/application", () => ({ nextAction: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {},
  forWorkspace: vi.fn(),
}));
vi.mock("@repo/domain", () => ({ canTransitionTask: vi.fn() }));
vi.mock("@repo/observability/business-events", () => ({
  emitBusinessEvent: vi.fn(),
}));

describe("GET /now", () => {
  beforeEach(() => vi.clearAllMocks());

  test("rejects a caller without at least MEMBER role", async () => {
    const { requireRole } = await import("@repo/auth/server");
    vi.mocked(requireRole).mockRejectedValueOnce(
      new InsufficientRoleError("MEMBER")
    );

    const { GET } = await import("../app/now/route");
    const response = await GET();

    expect(response.status).toBe(403);
  });

  test("returns nextAction's real result shape", async () => {
    const { requireRole } = await import("@repo/auth/server");
    const { nextAction } = await import("@repo/application");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });
    vi.mocked(nextAction).mockResolvedValueOnce({ kind: "NONE" });

    const { GET } = await import("../app/now/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ kind: "NONE" });
    expect(nextAction).toHaveBeenCalledWith("workspace-1");
  });
});

describe("POST /now/advance", () => {
  beforeEach(() => vi.clearAllMocks());

  const request = (body: unknown) =>
    new Request("http://localhost/now/advance", {
      method: "POST",
      body: JSON.stringify(body),
    });

  test("rejects a caller without an active workspace", async () => {
    const { requireRole, NoActiveOrganizationError } = await import(
      "@repo/auth/server"
    );
    vi.mocked(requireRole).mockRejectedValueOnce(
      new NoActiveOrganizationError()
    );

    const { POST } = await import("../app/now/advance/route");
    const response = await POST(request({ taskId: "t1", toState: "DOING" }));

    expect(response.status).toBe(409);
  });

  test("advances a task and returns the updated row", async () => {
    const { requireRole } = await import("@repo/auth/server");
    const { forWorkspace } = await import("@repo/database");
    const { canTransitionTask } = await import("@repo/domain");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });
    vi.mocked(canTransitionTask).mockReturnValueOnce("ALLOW");
    const updated = { id: "t1", state: "DOING" };
    const db = {
      task: {
        findUnique: vi.fn().mockResolvedValueOnce({ id: "t1", state: "READY" }),
        update: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValueOnce([updated]),
      evidence: { create: vi.fn() },
      auditEvent: { create: vi.fn() },
    };
    vi.mocked(forWorkspace).mockReturnValueOnce(db as any);

    const { POST } = await import("../app/now/advance/route");
    const response = await POST(request({ taskId: "t1", toState: "DOING" }));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ ok: true, task: updated });
  });
});
