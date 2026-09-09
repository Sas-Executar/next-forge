import { Card, CardDescription, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import {
  NoActiveOrganizationError,
  requireWorkspace,
  WorkspaceNotFoundError,
} from "@repo/auth/server";
import type { ReactElement } from "react";

type Workspace = Awaited<ReturnType<typeof requireWorkspace>>;

/**
 * Shared workspace-resolution + fallback UI for every authenticated page
 * that reads workspace-scoped data. Every /now, /projects, and M05 route
 * needs the same "no active org" / "not synced yet" handling — this is
 * that handling, once.
 *
 * `ok` is a literal-typed discriminant on purpose: TypeScript only
 * correlates narrowing of *other* properties (like `workspace`) across
 * a union when the discriminant property's type is a unit type (literal
 * `true`/`false`, not an object type like `ReactElement`) in every
 * member — so the tag has to be `ok`, not truthiness of `fallback`.
 */
export const resolveWorkspace = async (): Promise<
  | { ok: true; workspace: Workspace }
  | { ok: false; fallback: ReactElement }
> => {
  try {
    const workspace = await requireWorkspace();
    return { ok: true, workspace };
  } catch (error) {
    if (
      error instanceof NoActiveOrganizationError ||
      error instanceof WorkspaceNotFoundError
    ) {
      return {
        ok: false,
        fallback: (
          <div className="p-8">
            <Card>
              <CardHeader>
                <CardTitle>Nenhum workspace ativo</CardTitle>
                <CardDescription>
                  {error instanceof NoActiveOrganizationError
                    ? "Selecione ou crie uma organização para continuar."
                    : "Este workspace ainda não foi sincronizado. Tente novamente em instantes."}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ),
      };
    }
    throw error;
  }
};
