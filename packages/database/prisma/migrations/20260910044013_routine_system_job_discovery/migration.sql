-- Narrow, read-only RLS carve-out for cross-tenant Routine discovery
-- (M10-T03, the routines scheduler). rls.ts's own doc comment (M03)
-- names exactly this problem — "the M10 routines scheduler processing
-- many workspaces" — and says the scheduler "must call [forWorkspace()]
-- per workspace it touches," but under the workspace_isolation policy
-- alone there is no way to get the initial cross-tenant list of
-- (workspaceId, routineId) pairs to iterate: every table, Routine
-- included, is FORCE RLS with a single-workspace-at-a-time policy, and
-- rls.ts deliberately exports no general bypass client.
--
-- This is not that bypass. It's a second, additive policy on exactly
-- one table, for exactly one operation: a session that explicitly sets
-- `app.is_system_job = 'true'` may SELECT every ENABLED Routine's id
-- and workspaceId — read-only discovery, nothing else. Every actual
-- read or write for a specific routine's execution still goes through
-- forWorkspace(routine.workspaceId) exactly as before (see
-- packages/routines/src/pipeline.ts) — this policy only answers "what
-- exists," never "what's inside it."
CREATE POLICY "system_job_discovery" ON "Routine"
  FOR SELECT
  USING (current_setting('app.is_system_job', true) = 'true');
