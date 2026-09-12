-- M15 (Observability): extends AIUsage with the OBS-006 "campos
-- obrigatórios por chamada" the M02 stub didn't yet carry, and adds
-- TelemetryEvent — a local, workspace-scoped record of the OBS-BIZ-001
-- business event catalog (billing.*, product.*, ai.*, channel.*).

ALTER TABLE "AIUsage"
  ADD COLUMN "traceId" TEXT,
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'openai',
  ADD COLUMN "capabilityId" TEXT,
  ADD COLUMN "providerCostNative" DECIMAL(12, 6),
  ADD COLUMN "nativeCurrency" TEXT,
  ADD COLUMN "fxRateBrl" DECIMAL(12, 6),
  ADD COLUMN "outcome" TEXT;

CREATE INDEX "AIUsage_traceId_idx" ON "AIUsage" ("traceId");

CREATE TABLE "TelemetryEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "traceId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "component" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "costBrl" DECIMAL(12, 6),
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TelemetryEvent_workspaceId_idx" ON "TelemetryEvent" ("workspaceId");
CREATE INDEX "TelemetryEvent_eventName_idx" ON "TelemetryEvent" ("eventName");
CREATE INDEX "TelemetryEvent_traceId_idx" ON "TelemetryEvent" ("traceId");

ALTER TABLE "TelemetryEvent"
  ADD CONSTRAINT "TelemetryEvent_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Same workspace_isolation shape every other tenant-scoped table got in
-- 20260909173722_enable_rls.
ALTER TABLE "TelemetryEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TelemetryEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON "TelemetryEvent"
  USING ("workspaceId" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.current_workspace_id', true));
