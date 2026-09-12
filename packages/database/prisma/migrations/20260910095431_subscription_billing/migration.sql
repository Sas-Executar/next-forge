-- M13 (Billing): adds Subscription.purchasedSeats (M13-T05, PRICING-001
-- §5 — Business seats beyond the 5 included) and a narrow, read-only
-- system_job_discovery RLS policy on Subscription — the same shape as
-- 20260910044013_routine_system_job_discovery (M10) and
-- 20260910120500_integration_system_job_discovery (M11), applied to a
-- third table. A Stripe webhook arrives with only a Stripe customer/
-- subscription id, no workspaceId — forWorkspace() structurally cannot
-- answer "which workspace owns this Stripe customer" before one is
-- chosen. This lets a session that has explicitly set
-- `app.is_system_job = 'true'` (rls.ts's forSystemJob(), unchanged since
-- M10) SELECT Subscription rows to resolve the owning workspace; every
-- subsequent write for that event still goes through
-- forWorkspace(subscription.workspaceId) exactly as every other
-- request-scoped code path does. Postgres combines multiple permissive
-- policies with OR, so this is additive to workspace_isolation, not a
-- replacement for it.

ALTER TABLE "Subscription" ADD COLUMN "purchasedSeats" INTEGER NOT NULL DEFAULT 0;

CREATE POLICY "system_job_discovery" ON "Subscription"
  FOR SELECT
  USING (current_setting('app.is_system_job', true) = 'true');
