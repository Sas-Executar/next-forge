"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProject } from "@/app/actions/execution/create-project";

export const CreateProjectForm = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createProject({ name: name.trim() });
        setName("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Falha ao criar o projeto.");
      }
    });
  };

  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <Input
        aria-label="Nome do novo projeto"
        disabled={isPending}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nome do projeto"
        value={name}
      />
      <Button disabled={isPending || !name.trim()} type="submit">
        Criar projeto
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
};
