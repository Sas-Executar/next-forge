"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { connectWhatsApp } from "@/app/actions/integrations/connect-whatsapp";

/**
 * WhatsApp has no OAuth consent screen (see connect-whatsapp.ts's own
 * comment) — this is a plain form for the one value a workspace needs
 * to supply: its Meta phone_number_id, found in Meta Business Manager.
 */
export const WhatsAppConnectForm = () => {
  const router = useRouter();
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await connectWhatsApp({ phoneNumberId });
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Falha ao conectar."
        );
      }
    });
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <Input
        aria-label="phone_number_id do WhatsApp (Meta Business Manager)"
        onChange={(event) => setPhoneNumberId(event.target.value)}
        placeholder="phone_number_id (Meta Business Manager)"
        value={phoneNumberId}
      />
      <Button
        disabled={isPending || phoneNumberId.length === 0}
        size="sm"
        type="submit"
      >
        {isPending ? "Conectando…" : "Conectar WhatsApp"}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </form>
  );
};
