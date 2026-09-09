-- Enables Postgres Row Level Security (RLS) on Workspace and every
-- workspace-scoped table (M03-T03), enforcing tenant isolation at the
-- database layer, not just in application code.
--
-- Pairs with packages/database/rls.ts's `forWorkspace(workspaceId)`,
-- which sets `app.current_workspace_id` via `set_config(..., TRUE)`
-- inside a transaction before every query issued through the client it
-- returns (Prisma's documented RLS pattern: a session-local Postgres
-- GUC checked by each policy's USING/WITH CHECK clause).
--
-- FORCE ROW LEVEL SECURITY (not just ENABLE) is required on every table:
-- by default Postgres exempts the table OWNER from RLS, and the
-- application connects as that owner (DATABASE_URL) — without FORCE,
-- these policies would silently do nothing for the app's own queries.
--
-- Fail-closed: `current_setting('app.current_workspace_id', true)`
-- returns NULL when unset (the `true` arg means "missing_ok"), and
-- `"col" = NULL` is never true in SQL — so a session that never called
-- forWorkspace() sees zero rows here, not every workspace's rows. The
-- unscoped `database` export (packages/database/index.ts) is the
-- Postgres table owner and therefore bypasses these policies entirely,
-- by design — it exists only for migrations, the seed script, and the
-- Clerk webhook (packages/database usage, both intentionally
-- unscoped: see rls.ts's own doc comment for why).
--
-- Workspace itself is included (keyed on `id`, not `workspaceId`) so a
-- scoped session can only ever see its own workspace row, not enumerate
-- every tenant.


-- Workspace (root — keyed on "id", not "workspaceId")
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Workspace"
  USING ("id" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("id" = current_setting('app.current_workspace_id', true));

-- Membership
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Membership"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Project
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Project"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Process
ALTER TABLE "Process" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Process" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Process"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Deliverable
ALTER TABLE "Deliverable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deliverable" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Deliverable"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Task
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Task"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Action
ALTER TABLE "Action" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Action" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Action"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Evidence
ALTER TABLE "Evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evidence" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Evidence"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Dependency
ALTER TABLE "Dependency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dependency" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Dependency"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Routine
ALTER TABLE "Routine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Routine" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Routine"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- RoutineRun
ALTER TABLE "RoutineRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoutineRun" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "RoutineRun"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- WorkflowDefinition
ALTER TABLE "WorkflowDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowDefinition" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "WorkflowDefinition"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- WorkflowRun
ALTER TABLE "WorkflowRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowRun" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "WorkflowRun"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- StatusReport
ALTER TABLE "StatusReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StatusReport" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "StatusReport"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- MapaOS
ALTER TABLE "MapaOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MapaOS" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "MapaOS"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- VisualSymbol
ALTER TABLE "VisualSymbol" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VisualSymbol" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "VisualSymbol"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- ScannerMutation
ALTER TABLE "ScannerMutation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScannerMutation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "ScannerMutation"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Attachment
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Attachment"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- IntegrationConnection
ALTER TABLE "IntegrationConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntegrationConnection" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "IntegrationConnection"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- ExternalObjectRef
ALTER TABLE "ExternalObjectRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalObjectRef" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "ExternalObjectRef"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- AgentRun
ALTER TABLE "AgentRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentRun" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "AgentRun"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- ToolCall
ALTER TABLE "ToolCall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ToolCall" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "ToolCall"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- AIUsage
ALTER TABLE "AIUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIUsage" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "AIUsage"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Notification
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Notification"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- Subscription
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "Subscription"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- UsageLedger
ALTER TABLE "UsageLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageLedger" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "UsageLedger"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- ExecutionCredit
ALTER TABLE "ExecutionCredit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutionCredit" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "ExecutionCredit"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));

-- AuditEvent
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "AuditEvent"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));
