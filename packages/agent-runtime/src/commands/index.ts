import type { OrchestratorOutput } from "../output-schema";
import { runAgora } from "./agora";
import { runBomdia } from "./bomdia";
import { runEstado } from "./estado";
import { runFechardia } from "./fechardia";
import type { PrimaryCommandId } from "./types";

export { runAgora } from "./agora";
export { runBomdia } from "./bomdia";
export { runEstado } from "./estado";
export { runFechardia } from "./fechardia";
export {
  confirmReplan,
  proposeReplan,
  type ReplanProposal,
  type ReplanTaskProposal,
} from "./replanejamento";
export * from "./types";

/**
 * Dispatcher for the 4 commands runnable from just a workspace id.
 * /replanejamento is intentionally not included here — it's a two-step
 * propose/confirm pair (see replanejamento.ts) that needs a proposal
 * payload and, for confirm, a confirming actor ref, so it doesn't fit
 * this single-argument shape. Callers (the /api/chat route) invoke
 * proposeReplan/confirmReplan directly.
 */
export const runPrimaryCommand = (
  commandId: Exclude<PrimaryCommandId, "replanejamento">,
  workspaceId: string
): Promise<OrchestratorOutput> => {
  switch (commandId) {
    case "bomdia":
      return runBomdia(workspaceId);
    case "agora":
      return runAgora(workspaceId);
    case "estado":
      return runEstado(workspaceId);
    case "fechardia":
      return runFechardia(workspaceId);
    default: {
      const exhaustive: never = commandId;
      throw new Error(`Unhandled command: ${exhaustive as string}`);
    }
  }
};
