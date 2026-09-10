-- Narrow, read-only RLS carve-out for cross-tenant IntegrationConnection
-- discovery (M11-T06, the inbound WhatsApp/Gmail/Outlook webhook routes)
-- — the same shape as 20260910044013_routine_system_job_discovery for
-- the M10 routines scheduler, applied to a second table.
--
-- An inbound provider webhook arrives with only an external identifier
-- (a WhatsApp phone_number_id, a Gmail address, a Graph subscription's
-- resource) — it has no workspaceId yet, and forWorkspace() structurally
-- cannot answer "which workspace owns this external account" before one
-- is chosen. This policy lets a session that has explicitly set
-- `app.is_system_job = 'true'` (rls.ts's forSystemJob(), unchanged from
-- M10) SELECT IntegrationConnection rows — read-only discovery of which
-- workspace + connection an inbound event belongs to. Every subsequent
-- read or write for that event (normalizing the object, writing
-- ExternalObjectRef, emitting the audit event) still goes through
-- forWorkspace(connection.workspaceId) exactly as every other
-- request-scoped code path does.
--
-- Postgres combines multiple permissive policies with OR, so this is
-- additive to workspace_isolation, not a replacement for it.
CREATE POLICY "system_job_discovery" ON "IntegrationConnection"
  FOR SELECT
  USING (current_setting('app.is_system_job', true) = 'true');
