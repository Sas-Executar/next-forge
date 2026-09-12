"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PROJECTIONS = [
  { id: "mapa_operacional", label: "Operacional" },
  { id: "agora_proximo_depois", label: "Agora/Próximo/Depois" },
  { id: "status_terminal", label: "Status Terminal" },
  { id: "prisma_7d", label: "Prisma 7D" },
] as const;

interface ProjectionToggleProperties {
  readonly current: string;
}

export const ProjectionToggle = ({ current }: ProjectionToggleProperties) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setProjection = (projection: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projection", projection);
    params.delete("authorized");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-1">
      {PROJECTIONS.map((p) => (
        <Button
          key={p.id}
          onClick={() => setProjection(p.id)}
          size="sm"
          variant={current === p.id ? "default" : "outline"}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
};
