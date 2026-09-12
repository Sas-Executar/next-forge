import { forWorkspace, type Prisma } from "@repo/database";

/**
 * Internal channel.* events for the omnichannel adapters (M11), the
 * same "code-owned event names, disclosed as such" resolution D8 used
 * for SPEC-ROUTINES-001's routine.* list: no Blueprint source enumerates
 * a channel-adapter event vocabulary (OBS-BIZ-001 only names the
 * `channel.*` *prefix* as one of its five business-event families,
 * without listing members), so this is this package's own minimal set,
 * recorded as AuditEvent rows exactly like routine.* and every other
 * mutating package's audit trail. Mapping a subset to OBS-BIZ-001's
 * external channel.* business events remains M15's job.
 */
export type IntegrationEventName =
  | "channel.connected"
  | "channel.disconnected"
  | "channel.message_received"
  | "channel.message_sent"
  | "channel.send_failed"
  | "channel.webhook_verification_failed"
  | "channel.object_normalized";

export const emitIntegrationEvent = async (
  workspaceId: string,
  name: IntegrationEventName,
  objectId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> => {
  const db = forWorkspace(workspaceId);
  await db.auditEvent.create({
    data: {
      workspaceId,
      actorType: "SYSTEM",
      action: name,
      objectType: "IntegrationConnection",
      objectId,
      metadata: metadata as unknown as Prisma.InputJsonValue | undefined,
    },
  });
};
