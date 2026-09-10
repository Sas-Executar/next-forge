"use client";

import type { Task } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  TASK_STATE_LABEL_PT,
  TASK_STATE_TRANSITIONS,
  type TaskState,
} from "@repo/schemas";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeAction } from "@/app/actions/execution/complete-action";

// PT-BR labels are presentation only — never alter the canonical state
// value itself (skills/copiloto-executar/SKILL.md, Blueprint, read-only:
// "Não alterar o estado canônico apenas para traduzir a interface").
const TRANSITION_LABEL_PT: Partial<Record<TaskState, string>> = {
  DOING: "Iniciar",
  VERIFY: "Enviar para verificação",
  DONE: "Concluir",
  BLOCKED: "Bloquear",
};

interface TaskActionsProperties {
  readonly task: Pick<Task, "id" | "state">;
}

export const TaskActions = ({ task }: TaskActionsProperties) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [evidenceTargetOpen, setEvidenceTargetOpen] = useState(false);
  const [evidenceDescription, setEvidenceDescription] = useState("");

  const candidateStates = TASK_STATE_TRANSITIONS[task.state];

  const advance = (toState: TaskState, evidenceDesc?: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await completeAction({
          taskId: task.id,
          toState,
          evidence: evidenceDesc
            ? { description: evidenceDesc, grade: "A_OBSERVADO" }
            : undefined,
        });
        setEvidenceTargetOpen(false);
        setEvidenceDescription("");
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Falha ao atualizar a tarefa."
        );
      }
    });
  };

  if (candidateStates.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {candidateStates.map((toState) =>
          toState === "DONE" ? (
            <Button
              disabled={isPending}
              key={toState}
              onClick={() => setEvidenceTargetOpen((open) => !open)}
              type="button"
              variant={evidenceTargetOpen ? "secondary" : "default"}
            >
              {TRANSITION_LABEL_PT[toState] ?? TASK_STATE_LABEL_PT[toState]}
            </Button>
          ) : (
            <Button
              disabled={isPending}
              key={toState}
              onClick={() => advance(toState)}
              type="button"
              variant={toState === "BLOCKED" ? "outline" : "default"}
            >
              {TRANSITION_LABEL_PT[toState] ?? TASK_STATE_LABEL_PT[toState]}
            </Button>
          )
        )}
      </div>

      {evidenceTargetOpen && (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-muted-foreground text-sm">
            {
              "'feito' não substitui evidência — descreva o que comprova a conclusão."
            }
          </p>
          <Textarea
            aria-label="Descrição da evidência de conclusão"
            onChange={(event) => setEvidenceDescription(event.target.value)}
            placeholder="O que comprova que esta tarefa foi concluída?"
            value={evidenceDescription}
          />
          <Button
            disabled={isPending || evidenceDescription.trim().length === 0}
            onClick={() => advance("DONE", evidenceDescription.trim())}
            type="button"
          >
            Confirmar conclusão
          </Button>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
};
