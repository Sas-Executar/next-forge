import "server-only";
import { forWorkspace } from "@repo/database";
import { emitIntegrationEvent } from "./events";
import type { NormalizedInboundEvent } from "./types";

/**
 * PRD-OMNI-001's normalization layer (REQ-OMNI-001: every external
 * object maps to exactly one canonical row). Idempotent by
 * construction: ExternalObjectRef's unique constraint is
 * [integrationConnectionId, externalId] (packages/database/schema.prisma),
 * so re-delivery of the same webhook event (every provider here retries
 * at-least-once) upserts the same row rather than duplicating it.
 *
 * `canonicalObjectType`/`canonicalObjectId` default to the external
 * object itself (no domain mapping decided yet — see types.ts's
 * NormalizedInboundEvent comment) unless the caller already knows what
 * this maps to (e.g. an outbound delivery confirmation tied to a
 * specific StatusReport).
 */
export const normalizeExternalObject = async (
  workspaceId: string,
  integrationConnectionId: string,
  event: NormalizedInboundEvent,
  canonical?: {
    readonly canonicalObjectType: string;
    readonly canonicalObjectId: string;
  }
): Promise<void> => {
  const db = forWorkspace(workspaceId);
  await db.externalObjectRef.upsert({
    where: {
      integrationConnectionId_externalId: {
        integrationConnectionId,
        externalId: event.externalId,
      },
    },
    create: {
      workspaceId,
      integrationConnectionId,
      externalId: event.externalId,
      externalObjectType: event.externalObjectType,
      canonicalObjectType:
        canonical?.canonicalObjectType ?? event.externalObjectType,
      canonicalObjectId: canonical?.canonicalObjectId ?? event.externalId,
    },
    update: {
      canonicalObjectType: canonical?.canonicalObjectType,
      canonicalObjectId: canonical?.canonicalObjectId,
    },
  });

  await emitIntegrationEvent(
    workspaceId,
    "channel.object_normalized",
    event.externalId,
    {
      externalObjectType: event.externalObjectType,
    }
  );
};
