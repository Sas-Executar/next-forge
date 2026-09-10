import "server-only";
import { database } from "./index";

/**
 * Returns a Prisma Client scoped to one workspace via Postgres RLS
 * (M03-T03): every query issued through the returned client runs inside
 * a transaction that first sets the `app.current_workspace_id` session
 * variable the RLS policies (prisma/migrations/*_enable_rls) check.
 *
 * The base `database` export (./index.ts) stays unscoped/raw — for
 * migrations, the seed script, and the Clerk webhook (which resolves
 * Workspace by clerkOrgId before any workspace-scoped query exists to
 * guard). Request-scoped app code should use this instead, once
 * `requireWorkspace()` (@repo/auth) has resolved the workspace:
 *
 *   const workspace = await requireWorkspace();
 *   const db = forWorkspace(workspace.id);
 *   const tasks = await db.task.findMany(); // RLS-filtered to `workspace`
 *
 * Follows Prisma's documented RLS integration pattern:
 * https://www.prisma.io/docs/orm/prisma-client/queries/row-level-security
 *
 * Fail-closed by design: the RLS policies compare against
 * `current_setting('app.current_workspace_id', true)`, which is NULL
 * when unset — and `"workspaceId" = NULL` is never true in SQL, so an
 * unscoped session sees zero rows in every RLS-protected table rather
 * than leaking across tenants. A background job with no single "current
 * viewer" (e.g. the M10 routines scheduler processing many workspaces)
 * must call this per workspace it touches — there is no bypass client
 * exported here on purpose.
 *
 * Caveat: RLS policies live in hand-authored migration SQL, not in
 * schema.prisma (Prisma has no RLS primitive in the schema language) —
 * always add new policies as their own migration; nothing here keeps
 * schema.prisma and the applied policies in sync automatically.
 */
export const forWorkspace = (workspaceId: string) =>
  database.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await database.$transaction([
            database.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });

/**
 * The one narrow exception to "no bypass client" above (M10-T03,
 * prisma/migrations/*_routine_system_job_discovery): read-only,
 * cross-tenant discovery of ENABLED Routine rows for the scheduler,
 * which has no single workspace to scope to before it even knows which
 * workspaces have due routines. Sets `app.is_system_job`, a distinct
 * GUC from `app.current_workspace_id` — this does not grant access to
 * any other table or operation, and every actual execution step
 * (packages/routines/src/pipeline.ts) still runs through
 * forWorkspace(routine.workspaceId) exactly as request-scoped code
 * does. Do not reach for this outside that one discovery query.
 */
export const forSystemJob = () =>
  database.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await database.$transaction([
            database.$executeRaw`SELECT set_config('app.is_system_job', 'true', TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
