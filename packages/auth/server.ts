import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { MembershipRole } from "@repo/database";
import { database } from "@repo/database";
import { hasRole } from "./src/permissions";

export * from "@clerk/nextjs/server";
export * from "./src/permissions";

export class NoActiveOrganizationError extends Error {
  constructor() {
    super("No active Clerk organization on this session.");
    this.name = "NoActiveOrganizationError";
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor(clerkOrgId: string) {
    super(
      `No workspace found for Clerk organization ${clerkOrgId} — the Clerk webhook may not have synced yet.`
    );
    this.name = "WorkspaceNotFoundError";
  }
}

export class InsufficientRoleError extends Error {
  constructor(required: MembershipRole) {
    super(`Requires ${required} role in this workspace.`);
    this.name = "InsufficientRoleError";
  }
}

/**
 * Resolves the local Workspace row for the session's active Clerk
 * organization (D3: Workspace.clerkOrgId is the tenancy key). Throws
 * rather than silently degrading — every caller decides how to handle
 * "no active org" / "not synced yet" (e.g. redirect to onboarding),
 * matching the corpus's fail-safe principle: never invent state.
 *
 * Returns the raw Workspace row, not an RLS-scoped Prisma client — pair
 * with `forWorkspace()` (@repo/database) for RLS-enforced queries:
 * `const workspace = await requireWorkspace(); const db =
 * forWorkspace(workspace.id);`
 */
export const requireWorkspace = async () => {
  const { orgId } = await auth();
  if (!orgId) {
    throw new NoActiveOrganizationError();
  }

  const workspace = await database.workspace.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (!workspace) {
    throw new WorkspaceNotFoundError(orgId);
  }

  return workspace;
};

/**
 * Requires the session's user to hold at least `role` in the resolved
 * workspace (OWNER satisfies a MEMBER requirement, not the reverse), via
 * `hasRole()` (./src/permissions.ts) — the same comparator M16-T01's
 * permission matrix regression test exercises directly, so this real
 * gate and that matrix can't drift into two different definitions of
 * "at least". Provisional 2-role model — see the MembershipRole comment
 * in packages/database/prisma/schema.prisma.
 */
export const requireRole = async (role: MembershipRole) => {
  const { userId } = await auth();
  const workspace = await requireWorkspace();

  const membership = userId
    ? await database.membership.findUnique({
        where: {
          workspaceId_clerkUserId: {
            workspaceId: workspace.id,
            clerkUserId: userId,
          },
        },
      })
    : null;

  if (!(membership && hasRole(membership.role, role))) {
    throw new InsufficientRoleError(role);
  }

  return { workspace, membership };
};
