import { env } from "@/env";

// The 4 deterministic commands exposed to mobile — same scope cut as
// apps/api/app/copilot/command/route.ts: /replanejamento and free-form
// AI chat are web-only for now.
export type MobileCopilotCommandId =
  | "bomdia"
  | "agora"
  | "estado"
  | "fechardia";

export interface OrchestratorOutputUi {
  agora: string;
  conclui_quando?: string | null;
  evidencia?: string | null;
  headline: string;
  proxima_acao: string;
  tempo?: string | null;
}

export interface OrchestratorOutput {
  status: "OK" | "BLOQUEADO" | "CONDICIONAL" | "ERRO";
  ui: OrchestratorOutputUi;
  warnings?: string[];
}

class RunCommandFailedError extends Error {
  constructor(status: number) {
    super(`/copilot/command failed: HTTP ${status}`);
    this.name = "RunCommandFailedError";
  }
}

export const runCommand = async (
  commandId: MobileCopilotCommandId,
  sessionToken: string
): Promise<OrchestratorOutput> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(
    new URL("/copilot/command", env.EXPO_PUBLIC_API_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ commandId }),
    }
  );
  if (!response.ok) {
    throw new RunCommandFailedError(response.status);
  }
  return (await response.json()) as OrchestratorOutput;
};
