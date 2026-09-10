import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type {
  listEnabledSymbols as ListEnabledSymbols,
  registerSymbol as RegisterSymbol,
  setSymbolEnabled as SetSymbolEnabled,
} from "../src/registry";

/**
 * Real DB-backed registry — same skip/dynamic-import pattern as every
 * other DB-gated suite in this repo. Covers REQ-SCAN-003 (registry
 * persistence) and REQ-SCAN-004 (re-enrollment replaces embeddings
 * without deleting the row).
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/scanner).
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "registerSymbol / listEnabledSymbols (M09-T02)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let registerSymbol: typeof RegisterSymbol;
    let listEnabledSymbols: typeof ListEnabledSymbols;
    let setSymbolEnabled: typeof SetSymbolEnabled;
    let workspaceId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ registerSymbol, listEnabledSymbols, setSymbolEnabled } = await import(
        "../src/registry"
      ));

      const workspace = await database.workspace.create({
        data: {
          clerkOrgId: `org_scanner_registry_test_${suffix}`,
          name: "Scanner Registry Test",
        },
      });
      workspaceId = workspace.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("round-trips multiple reference embeddings through the Bytes column", async () => {
      const embeddings = [
        new Float32Array([1, 2, 3]),
        new Float32Array([4, 5, 6]),
      ];
      const registered = await registerSymbol(workspaceId, {
        symbolId: "SYM-SELECTOR-001",
        semantic: "SELECTOR",
        command: "OPEN_SELECTOR",
        embeddings,
      });
      expect(registered.embeddings).toHaveLength(2);
      expect(Array.from(registered.embeddings[0] as Float32Array)).toEqual([
        1, 2, 3,
      ]);

      const listed = await listEnabledSymbols(workspaceId);
      const found = listed.find((s) => s.symbolId === "SYM-SELECTOR-001");
      expect(found?.embeddings).toHaveLength(2);
    });

    test("re-enrollment (REQ-SCAN-004) replaces embeddings on the same symbolId, not a duplicate row", async () => {
      await registerSymbol(workspaceId, {
        symbolId: "SYM-CHAT-001",
        semantic: "CHAT",
        command: "OPEN_CHAT",
        embeddings: [new Float32Array([1, 0])],
      });
      await registerSymbol(workspaceId, {
        symbolId: "SYM-CHAT-001",
        semantic: "CHAT",
        command: "OPEN_CHAT",
        embeddings: [new Float32Array([0, 1])],
      });

      const rows = await database.visualSymbol.findMany({
        where: { workspaceId, symbolId: "SYM-CHAT-001" },
      });
      expect(rows).toHaveLength(1);

      const listed = await listEnabledSymbols(workspaceId);
      const found = listed.find((s) => s.symbolId === "SYM-CHAT-001");
      expect(Array.from(found?.embeddings[0] as Float32Array)).toEqual([0, 1]);
    });

    test("setSymbolEnabled(false) removes a symbol from listEnabledSymbols without deleting it", async () => {
      await registerSymbol(workspaceId, {
        symbolId: "SYM-DONE-001",
        semantic: "DONE",
        command: "COMPLETE_LATEST_OPEN_TASK",
        embeddings: [new Float32Array([1, 1, 1])],
      });
      await setSymbolEnabled(workspaceId, "SYM-DONE-001", false);

      const listed = await listEnabledSymbols(workspaceId);
      expect(listed.find((s) => s.symbolId === "SYM-DONE-001")).toBeUndefined();

      const row = await database.visualSymbol.findUnique({
        where: {
          workspaceId_symbolId: { workspaceId, symbolId: "SYM-DONE-001" },
        },
      });
      expect(row).not.toBeNull();
      expect(row?.enabled).toBe(false);
    });
  }
);
