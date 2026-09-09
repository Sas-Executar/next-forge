import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { PrismaFitError, populatePrismaA4 } from "../src/populate";
import type { agoraProximoDepois as AgoraProximoDepois } from "../src/projections/agora-proximo-depois";
import type { mapaOperacional as MapaOperacional } from "../src/projections/mapa-operacional";
import type { prisma7d as Prisma7d } from "../src/projections/prisma-7d";
import type { statusTerminal as StatusTerminal } from "../src/projections/status-terminal";

const PLACEHOLDER_PATTERN = /\{\{[A-Z0-9_]+\}\}/;

/**
 * Exercises the real DB-backed projections against a live Postgres —
 * same skip/dynamic-import pattern as every other DB-gated suite in
 * this repo. Run manually with: `DATABASE_URL=... bun run test`
 * (packages/mapa-os).
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "Mapa-OS projections (M07-T04)",
  () => {
    const suffix = randomUUID();
    let database: typeof Database;
    let mapaOperacional: typeof MapaOperacional;
    let agoraProximoDepois: typeof AgoraProximoDepois;
    let statusTerminal: typeof StatusTerminal;
    let prisma7d: typeof Prisma7d;
    let workspaceId: string;

    beforeAll(async () => {
      ({ database } = await import("@repo/database"));
      ({ mapaOperacional } = await import(
        "../src/projections/mapa-operacional"
      ));
      ({ agoraProximoDepois } = await import(
        "../src/projections/agora-proximo-depois"
      ));
      ({ statusTerminal } = await import("../src/projections/status-terminal"));
      ({ prisma7d } = await import("../src/projections/prisma-7d"));

      const workspace = await database.workspace.create({
        data: { clerkOrgId: `org_mapaos_test_${suffix}`, name: "Mapa-OS Test" },
      });
      workspaceId = workspace.id;
    });

    afterAll(async () => {
      await database.workspace.delete({ where: { id: workspaceId } });
      await database.$disconnect();
    });

    test("mapa_operacional on an empty workspace has no agora and evidenceExists=false", async () => {
      const result = await mapaOperacional(workspaceId);
      expect(result.agora).toBeNull();
      expect(result.evidenceExists).toBe(false);
      expect(result.evidenceQuestion).toBe("A prova descrita existe?");
    });

    test("agora_proximo_depois horizons never mutate anything, just read", async () => {
      const result = await agoraProximoDepois(workspaceId);
      expect(result.agora).toBeNull();
      expect(result.proximo).toEqual([]);
    });

    test("status_terminal reuses buildStatusReport's own derivation", async () => {
      const result = await statusTerminal(workspaceId);
      expect(result.header).toContain("%");
      expect(typeof result.evidenceCount).toBe("number");
    });

    test("prisma_7d gate: INSUFFICIENT_DATA without a near-term deliverable, OK once authorized", async () => {
      const blocked = await prisma7d(workspaceId);
      expect(blocked.kind).toBe("INSUFFICIENT_DATA");

      const authorized = await prisma7d(workspaceId, { authorized: true });
      expect(authorized.kind).toBe("OK");
      if (authorized.kind === "OK") {
        const html = populatePrismaA4(authorized.payload);
        expect(html).not.toMatch(PLACEHOLDER_PATTERN);
      }
    });

    test("prisma_7d gate: a real near-term deliverable makes it OK without authorization", async () => {
      const project = await database.project.create({
        data: { workspaceId, name: `Prisma7d project ${suffix}` },
      });
      const dueSoon = new Date();
      dueSoon.setUTCDate(dueSoon.getUTCDate() + 2);
      await database.deliverable.create({
        data: {
          workspaceId,
          projectId: project.id,
          title: "Entrega da semana",
          dueDate: dueSoon,
        },
      });

      const result = await prisma7d(workspaceId);
      expect(result.kind).toBe("OK");
      if (result.kind === "OK") {
        // populatePrismaA4 must succeed — no PrismaFitError, no leftover placeholders.
        expect(() => populatePrismaA4(result.payload)).not.toThrow(
          PrismaFitError
        );
      }
    });
  }
);
