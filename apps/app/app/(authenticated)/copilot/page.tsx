import type { Metadata } from "next";
import { resolveWorkspace } from "../lib/resolve-workspace";
import { CopilotChat } from "./copilot-chat";

export const metadata: Metadata = {
  title: "Copiloto",
  description: "Agent Interaction — comando/contexto (SPEC-WORKSPACE-001 §2).",
};

/**
 * Agent Interaction (SPEC-WORKSPACE-001 §2), M06-T04. Same
 * resolveWorkspace() fallback every M05 route uses — the chat itself is
 * a client component (copilot-chat.tsx) since useChat needs the browser.
 */
const CopilotPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }

  return <CopilotChat />;
};

export default CopilotPage;
