"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTask } from "@/app/actions/execution/create-task";

interface ExistingTaskOption {
  readonly id: string;
  readonly title: string;
}

interface CreateTaskFormProperties {
  readonly projectId: string;
  readonly existingTasks: readonly ExistingTaskOption[];
}

export const CreateTaskForm = ({
  projectId,
  existingTasks,
}: CreateTaskFormProperties) => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggleDependency = (taskId: string) => {
    setDependsOn((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    );
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createTask({
          projectId,
          title: title.trim(),
          dependsOnTaskIds: dependsOn.length ? dependsOn : undefined,
        });
        setTitle("");
        setDependsOn([]);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Falha ao criar a tarefa.");
      }
    });
  };

  return (
    <form className="flex flex-col gap-3 rounded-lg border p-4" onSubmit={onSubmit}>
      <div className="flex gap-2">
        <Input
          aria-label="Título da nova tarefa"
          disabled={isPending}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Título da tarefa"
          value={title}
        />
        <Button disabled={isPending || !title.trim()} type="submit">
          Adicionar tarefa
        </Button>
      </div>

      {existingTasks.length > 0 && (
        <div className="flex flex-col gap-1">
          <Label>Depende de (opcional)</Label>
          <div className="flex flex-wrap gap-3">
            {existingTasks.map((task) => (
              <label className="flex items-center gap-1.5 text-sm" key={task.id}>
                <input
                  checked={dependsOn.includes(task.id)}
                  onChange={() => toggleDependency(task.id)}
                  type="checkbox"
                />
                {task.title}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
};
