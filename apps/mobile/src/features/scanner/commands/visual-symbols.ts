import type { CommandResult, RegisteredSymbol } from "@repo/scanner";
import { env } from "@/env";

/**
 * Shared contract (SPEC-SCANNER-001's "target implementation
 * boundaries": "contrato compartilhado visual-symbols.ts") between the
 * vision pipeline and the scanner screen's UI — PT-BR labels for the
 * 3 V1 symbols, matching this repo's existing convention of keeping UI
 * labels separate from canonical values (packages/schemas'
 * TASK_STATE_LABEL_PT is the same pattern).
 */
export const SYMBOL_LABEL_PT: Readonly<Record<string, string>> = {
  "SYM-CHAT-001": "Chat",
  "SYM-SELECTOR-001": "Seletor",
  "SYM-DONE-001": "Feito",
};

class SymbolsFetchFailedError extends Error {
  constructor(status: number) {
    super(`/scanner/symbols failed: HTTP ${status}`);
    this.name = "SymbolsFetchFailedError";
  }
}

/**
 * Syncs the on-device registry from apps/api's /scanner/symbols route
 * (REQ-SCAN-002/003: recognition must work offline after installation
 * — the app is expected to call this while online and cache the
 * result, e.g. in component state or a persisted store, not to call it
 * per-scan; no offline persistence layer is wired yet in this
 * milestone — disclosed, same shape as this feature's other scope
 * boundaries).
 */
export const fetchRegisteredSymbols = async (
  sessionToken: string
): Promise<readonly RegisteredSymbol[]> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(
    new URL("/scanner/symbols", env.EXPO_PUBLIC_API_URL),
    {
      headers: { Authorization: `Bearer ${sessionToken}` },
    }
  );
  if (!response.ok) {
    throw new SymbolsFetchFailedError(response.status);
  }
  const body = (await response.json()) as {
    symbols: ReadonlyArray<{
      symbolId: string;
      semantic: RegisteredSymbol["semantic"];
      command: RegisteredSymbol["command"];
      enabled: boolean;
      embeddings: number[][];
    }>;
  };
  return body.symbols.map((s) => ({
    id: s.symbolId,
    symbolId: s.symbolId,
    semantic: s.semantic,
    command: s.command,
    enabled: s.enabled,
    embeddings: s.embeddings.map((e) => Float32Array.from(e)),
  }));
};

class UndoRequestFailedError extends Error {
  constructor(status: number) {
    super(`/scanner/undo failed: HTTP ${status}`);
    this.name = "UndoRequestFailedError";
  }
}

export const postUndo = async (
  mutationId: string,
  sessionToken: string
): Promise<CommandResult> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(
    new URL("/scanner/undo", env.EXPO_PUBLIC_API_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ mutationId }),
    }
  );
  if (!response.ok) {
    throw new UndoRequestFailedError(response.status);
  }
  return (await response.json()) as CommandResult;
};
