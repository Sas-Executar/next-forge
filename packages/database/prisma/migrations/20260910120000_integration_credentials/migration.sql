-- M11-T01..T04 (PRD-OMNI-001 adapters): OAuth/token storage columns on
-- IntegrationConnection, plus an index that lets an inbound webhook look
-- up which connection an external account belongs to.
--
-- accessTokenEncrypted / refreshTokenEncrypted store ciphertext only
-- (packages/integrations/src/crypto.ts, AES-256-GCM under
-- INTEGRATIONS_ENCRYPTION_KEY) — never a plaintext OAuth token, whether
-- or not this table is RLS-protected. tokenExpiresAt lets a client
-- refresh proactively rather than discovering expiry from a 401.
-- webhookSecret is provider-specific (WhatsApp's per-workspace verify
-- token, Outlook's clientState); Gmail's Pub/Sub push has no equivalent
-- shared secret, so it's simply unused for that provider.
ALTER TABLE "IntegrationConnection"
  ADD COLUMN "accessTokenEncrypted" TEXT,
  ADD COLUMN "refreshTokenEncrypted" TEXT,
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "webhookSecret" TEXT;

-- Every inbound webhook (WhatsApp/Gmail/Outlook) carries the external
-- account's own identifier (phone_number_id, the recipient email
-- address, the Graph subscription's resource owner), not a workspaceId
-- — this index is what lets the M11-T06 routes resolve "which
-- IntegrationConnection (and therefore which workspace) does this
-- event belong to" in one lookup, the same cross-tenant-discovery need
-- the M10 routines scheduler already had.
CREATE INDEX "IntegrationConnection_provider_externalAccountId_idx"
  ON "IntegrationConnection"("provider", "externalAccountId");
