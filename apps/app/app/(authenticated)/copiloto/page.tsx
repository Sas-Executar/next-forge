import { showCopiloto } from "@repo/feature-flags";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
 *
 * Fase 9 — gated behind `showCopiloto` (same `notFound()` convention
 * `webhooks/page.tsx` already uses for a route that isn't available to
 * every tenant): hiding the sidebar link (components/sidebar.tsx) alone
 * wouldn't stop a tenant with a bookmarked or typed-in URL from reaching
 * a feature that isn't rolled out to them yet.
 */
const CopilotPage = async () => {
  const enabled = await showCopiloto();
  if (!enabled) {
    notFound();
  }

  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }

  return <CopilotChat />;
};

export default CopilotPage;
