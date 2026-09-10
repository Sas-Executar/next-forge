"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runWorkflowNow } from "@/app/actions/automation/run-workflow";

export const RunWorkflowButton = ({
  workflowDefinitionId,
}: {
  readonly workflowDefinitionId: string;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await runWorkflowNow({ workflowDefinitionId });
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Falha ao executar workflow."
        );
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button disabled={isPending} onClick={onClick} size="sm" type="button">
        {isPending ? "Executando…" : "Executar agora"}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
};
