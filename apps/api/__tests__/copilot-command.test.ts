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
vi.mock("@repo/agent-runtime", () => ({
  runPrimaryCommand: vi.fn(),
  validateOrchestratorOutput: vi.fn((value: unknown) => value),
}));

const validOutput = {
  status: "OK",
  route: { module: "ORQ-COP-001", action: "bomdia" },
  read_scope: ["Task"],
  write_policy: {
    allowed: false,
    targets: [],
    requires_human_confirmation: false,
  },
  ui: {
    headline: "Bom dia",
    agora: "Nada em progresso",
    proxima_acao: "Escolher a próxima ação",
  },
};

describe("POST /copilot/command", () => {
  beforeEach(() => vi.clearAllMocks());

  const request = (body: unknown) =>
    new Request("http://localhost/copilot/command", {
      method: "POST",
      body: JSON.stringify(body),
    });

  test("rejects a caller without at least MEMBER role", async () => {
    const { requireRole } = await import("@repo/auth/server");
    vi.mocked(requireRole).mockRejectedValueOnce(
      new InsufficientRoleError("MEMBER")
    );

    const { POST } = await import("../app/copilot/command/route");
    const response = await POST(request({ commandId: "bomdia" }));

    expect(response.status).toBe(403);
  });

  test("rejects replanejamento — only the 4 single-arg commands are exposed here", async () => {
    const { requireRole } = await import("@repo/auth/server");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });

    const { POST } = await import("../app/copilot/command/route");
    const response = await POST(request({ commandId: "replanejamento" }));

    expect(response.status).toBe(400);
  });

  test("runs a fixed command and returns its real OrchestratorOutput", async () => {
    const { requireRole } = await import("@repo/auth/server");
    const { runPrimaryCommand } = await import("@repo/agent-runtime");
    vi.mocked(requireRole).mockResolvedValueOnce({
      workspace: { id: "workspace-1" } as any,
      membership: { clerkUserId: "user-1" } as any,
    });
    vi.mocked(runPrimaryCommand).mockResolvedValueOnce(validOutput as any);

    const { POST } = await import("../app/copilot/command/route");
    const response = await POST(request({ commandId: "bomdia" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(validOutput);
    expect(runPrimaryCommand).toHaveBeenCalledWith("bomdia", "workspace-1");
  });
});
