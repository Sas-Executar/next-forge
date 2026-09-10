import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { normalizeExternalObject as NormalizeExternalObject } from "../src/normalize";

/**
 * Real DB-backed normalization — same skip/dynamic-import pattern as
 * every other DB-gated suite in this repo. Covers PRD-OMNI-001's
 * REQ-OMNI-001 ("um canal não cria estado concorrente"): re-delivering
 * the same external event upserts one ExternalObjectRef row, not two.
 *
 * Run manually with: `DATABASE_URL=... bun run test` (packages/integrations).
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "normalizeExternalObject (M11-T05)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let normalizeExternalObject: typeof NormalizeExternalObject;
    let workspaceId: string;
    let connectionId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ normalizeExternalObject } = await import("../src/normalize"));

      const workspace = await database.workspace.create({
        data: {
          clerkOrgId: `org_integrations_test_${suffix}`,
          name: "Integrations Test",
        },
      });
      workspaceId = workspace.id;

      const connection = await database.integrationConnection.create({
        data: {
          workspaceId,
          provider: "WHATSAPP",
          status: "CONNECTED",
          externalAccountId: `phone_${suffix}`,
        },
      });
      connectionId = connection.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("re-delivering the same externalId upserts one row, not two", async () => {
      const event = {
        externalId: `wamid.${suffix}`,
        externalObjectType: "whatsapp_message",
        receivedAt: new Date().toISOString(),
        payload: { text: "oi" },
      };

      await normalizeExternalObject(workspaceId, connectionId, event);
      await normalizeExternalObject(workspaceId, connectionId, event);

      const refs = await database.externalObjectRef.findMany({
        where: {
          integrationConnectionId: connectionId,
          externalId: event.externalId,
        },
      });
      expect(refs).toHaveLength(1);
    });
  }
);
