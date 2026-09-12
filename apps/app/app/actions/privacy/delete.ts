"use server";

import { requireRole } from "@repo/auth/server";
import { forWorkspace } from "@repo/database";
import { redirect } from "next/navigation";
import { z } from "zod";

const deleteWorkspaceSchema = z.object({
  confirmWorkspaceName: z.string().min(1),
});

export class ConfirmationMismatchError extends Error {
  constructor() {
    super(
      "Confirmation text does not match the workspace name — nothing was deleted."
    );
    this.name = "ConfirmationMismatchError";
  }
}

/**
 * M16-T03 — LGPD data deletion ("eliminação"). OWNER-gated, and requires
 * typing the exact workspace name as confirmation (the same "type to
 * confirm" pattern most destructive-delete UIs use) before anything is
 * touched — this is the one irreversible write path in this whole
 * codebase, so it gets a deliberately higher bar than a plain
 * `requireRole` check.
 *
 * Deletes the Workspace row through the RLS-scoped `forWorkspace()`
 * client (no bypass, same as every other write in this repo); every
 * workspace-scoped table FKs to Workspace with `onDelete: Cascade`
 * (schema.prisma), so this one delete removes all of it — Membership,
 * Project, Task, Evidence, AuditEvent, everything — in one statement,
 * not 28 hand-written deletes that could drift out of sync with the
 * schema.
 *
 * Scope, disclosed: this removes EXECUTAR's own domain data for the
 * workspace. It does NOT delete the underlying Clerk organization or its
 * memberships — Clerk is a separate identity provider this codebase
 * doesn't own, and org deletion is Clerk's own dashboard/API surface,
 * out of scope here. It also does not touch data already sent to a
 * connected third party before disconnection (e.g. messages already
 * delivered via WhatsApp/Gmail/Outlook) — this deletes EXECUTAR's
 * record of the workspace, not every copy that ever left it.
 */
export const deleteWorkspaceData = async (
  formData: FormData
): Promise<never> => {
  const { confirmWorkspaceName } = deleteWorkspaceSchema.parse({
    confirmWorkspaceName: formData.get("confirmWorkspaceName"),
  });
  const { workspace } = await requireRole("OWNER");

  if (confirmWorkspaceName !== workspace.name) {
    throw new ConfirmationMismatchError();
  }

  const db = forWorkspace(workspace.id);
  await db.workspace.delete({ where: { id: workspace.id } });

  redirect("/");
};
