import "server-only";

import { auth } from "@clerk/nextjs/server";
import { database } from "@repo/database";
import type { MembershipRole } from "@repo/database";

export * from "@clerk/nextjs/server";

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

const ROLE_RANK: Record<MembershipRole, number> = { MEMBER: 0, OWNER: 1 };

/**
 * Requires the session's user to hold at least `role` in the resolved
 * workspace (OWNER satisfies a MEMBER requirement, not the reverse).
 * Provisional 2-role model — see the MembershipRole comment in
 * packages/database/prisma/schema.prisma; this is not the real
 * permission matrix (M16-T01), which the Blueprint's own SEC-004 leaves
 * an empty stub today.
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

  if (!membership || ROLE_RANK[membership.role] < ROLE_RANK[role]) {
    throw new InsufficientRoleError(role);
  }

  return { workspace, membership };
};
