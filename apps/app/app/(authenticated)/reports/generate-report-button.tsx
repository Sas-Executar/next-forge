"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateReport } from "@/app/actions/reports/generate-report";

export const GenerateReportButton = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await generateReport({});
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Falha ao gerar relatório."
        );
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button disabled={isPending} onClick={onClick} type="button">
        {isPending ? "Gerando…" : "Gerar relatório"}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
};
