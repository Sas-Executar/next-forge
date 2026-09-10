"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runRoutineNow } from "@/app/actions/routines/run-routine";

export const RunRoutineButton = ({
  routineId,
}: {
  readonly routineId: string;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await runRoutineNow({ routineId });
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Falha ao executar rotina."
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
