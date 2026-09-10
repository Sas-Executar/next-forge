import "server-only";

import { forWorkspace } from "@repo/database";
import { entitlementsForPlan } from "./entitlements";

export { BUSINESS_ADDITIONAL_SEAT_PRICE_CENTAVOS } from "./plans";

export interface SeatUsage {
  readonly activeMembers: number;
  readonly includedSeats: number | null;
  readonly purchasedSeats: number;
  /** null mirrors totalCapacity's null case — an Enterprise workspace's "room" is a contract term, not a computed number. */
  readonly seatsRemaining: number | null;
  /** null when includedSeats is null (Enterprise, contract-defined — no fixed capacity this repo can state). */
  readonly totalCapacity: number | null;
}

/**
 * M13-T05 — Business workspace seats: "workspace como contrato, não um
 * único seat como contrato" (PRICING-001 §5). Capacity is
 * `entitlementsForPlan(plan).seatsIncluded` (5 for Business, 1 for
 * Trial/Solo/Pro) plus `Subscription.purchasedSeats` (additional seats
 * bought at `BUSINESS_ADDITIONAL_SEAT_PRICE_CENTAVOS`/seat). Usage is
 * the real active `Membership` count, not a stored counter — same
 * "derived, never manual" discipline this repo applies to task/project
 * progress (M04/M05).
 */
export const getSeatUsage = async (workspaceId: string): Promise<SeatUsage> => {
  const db = forWorkspace(workspaceId);
  const [subscription, activeMembers] = await Promise.all([
    db.subscription.findUnique({ where: { workspaceId } }),
    db.membership.count({ where: { workspaceId } }),
  ]);

  const plan = subscription?.plan ?? "TRIAL";
  const includedSeats = entitlementsForPlan(plan).seatsIncluded;
  const purchasedSeats = subscription?.purchasedSeats ?? 0;
  const totalCapacity =
    includedSeats === null ? null : includedSeats + purchasedSeats;

  return {
    includedSeats,
    purchasedSeats,
    totalCapacity,
    activeMembers,
    seatsRemaining:
      totalCapacity === null ? null : totalCapacity - activeMembers,
  };
};

/**
 * Whether one more Membership can be added right now. An Enterprise
 * workspace (totalCapacity: null) is never blocked here — its actual
 * limit is a contract term this repo doesn't model, so this function
 * declines to invent one rather than silently enforcing a made-up cap.
 */
export const canAddMember = async (workspaceId: string): Promise<boolean> => {
  const usage = await getSeatUsage(workspaceId);
  return usage.seatsRemaining === null || usage.seatsRemaining > 0;
};
