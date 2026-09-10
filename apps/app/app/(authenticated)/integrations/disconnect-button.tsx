"use client";

import type { IntegrationProvider } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { disconnectIntegration } from "@/app/actions/integrations/disconnect";

export const DisconnectButton = ({
  provider,
}: {
  readonly provider: IntegrationProvider;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await disconnectIntegration({ provider });
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Falha ao desconectar."
        );
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={isPending}
        onClick={onClick}
        size="sm"
        type="button"
        variant="outline"
      >
        {isPending ? "Desconectando…" : "Desconectar"}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
};
