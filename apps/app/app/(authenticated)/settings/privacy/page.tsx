import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Metadata } from "next";
import { deleteWorkspaceData } from "@/app/actions/privacy/delete";
import { resolveWorkspace } from "../../lib/resolve-workspace";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Exportação e exclusão de dados do workspace (LGPD).",
};

/**
 * /settings/privacy (M16-T03). Both actions are OWNER-gated at the
 * action/route layer, not just hidden here — this page renders the same
 * for any workspace member (resolveWorkspace() only requires an active
 * workspace), matching /settings/billing's own pattern of "visible,
 * enforced deeper down" rather than duplicating the role check in two
 * places that could drift.
 */
const PrivacySettingsPage = async () => {
  const resolved = await resolveWorkspace();
  if (!resolved.ok) {
    return resolved.fallback;
  }
  const { workspace } = resolved;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Exportar dados</CardTitle>
          <CardDescription>
            Baixe uma cópia completa dos dados deste workspace (LGPD — acesso e
            portabilidade). Requer papel OWNER.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <a download href="/api/privacy/export">
              Baixar meus dados (JSON)
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Excluir workspace</CardTitle>
          <CardDescription>
            Remove permanentemente todos os dados deste workspace (LGPD —
            eliminação): projetos, tarefas, evidências, rotinas, reports,
            integrações e histórico de auditoria. Não afeta a organização no
            Clerk, apenas os dados do EXECUTAR. Requer papel OWNER e confirmação
            com o nome exato do workspace. Esta ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteWorkspaceData} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmWorkspaceName">
                Digite “{workspace.name}” para confirmar
              </Label>
              <Input
                id="confirmWorkspaceName"
                name="confirmWorkspaceName"
                required
              />
            </div>
            <Button
              className="w-fit"
              size="sm"
              type="submit"
              variant="destructive"
            >
              Excluir permanentemente
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacySettingsPage;
