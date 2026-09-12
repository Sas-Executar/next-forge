import "server-only";

import { forWorkspace } from "@repo/database";
import { entitlementsForPlan, type PlanEntitlements } from "./entitlements";

/**
 * Resolves the caller's real entitlements from their workspace's actual
 * `Subscription.plan` row — falling back to `TRIAL` when no Subscription
 * exists yet (every Workspace gets one on creation in the intended flow,
 * but this stays defensive rather than throwing for a workspace whose
 * Subscription row hasn't been created, e.g. immediately after the
 * Clerk org webhook and before the first checkout). Split out from
 * entitlements.ts (see that file's own comment) so the pure
 * PLAN_ENTITLEMENTS table stays importable without pulling in
 * `@repo/database`.
 */
export const getWorkspaceEntitlements = async (
  workspaceId: string
): Promise<PlanEntitlements> => {
  const subscription = await forWorkspace(workspaceId).subscription.findUnique({
    where: { workspaceId },
  });
  return entitlementsForPlan(subscription?.plan ?? "TRIAL");
};
