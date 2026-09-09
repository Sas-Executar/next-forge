"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface ViewModeToggleProperties {
  readonly current: "lista" | "kanban";
}

export const ViewModeToggle = ({ current }: ViewModeToggleProperties) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setView = (view: "lista" | "kanban") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-1">
      <Button
        onClick={() => setView("lista")}
        size="sm"
        variant={current === "lista" ? "default" : "outline"}
      >
        Lista
      </Button>
      <Button
        onClick={() => setView("kanban")}
        size="sm"
        variant={current === "kanban" ? "default" : "outline"}
      >
        Kanban
      </Button>
    </div>
  );
};
