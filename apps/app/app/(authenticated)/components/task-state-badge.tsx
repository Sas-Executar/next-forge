import { Badge } from "@repo/design-system/components/ui/badge";
import type { TaskState } from "@repo/schemas";

// PT-BR labels are presentation only — never alter the canonical state
// value itself (skills/copiloto-executar/SKILL.md, Blueprint, read-only:
// "Não alterar o estado canônico apenas para traduzir a interface").
export const TASK_STATE_LABEL_PT: Record<TaskState, string> = {
  BACKLOG_VALIDATED: "Validado",
  READY: "Pronto",
  DOING: "Em execução",
  VERIFY: "Verificar",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
};

const TASK_STATE_BADGE_VARIANT: Record<
  TaskState,
  "default" | "secondary" | "outline" | "destructive"
> = {
  BACKLOG_VALIDATED: "outline",
  READY: "secondary",
  DOING: "default",
  VERIFY: "secondary",
  DONE: "outline",
  BLOCKED: "destructive",
};

interface TaskStateBadgeProperties {
  readonly state: TaskState;
}

export const TaskStateBadge = ({ state }: TaskStateBadgeProperties) => (
  <Badge variant={TASK_STATE_BADGE_VARIANT[state]}>
    {TASK_STATE_LABEL_PT[state]}
  </Badge>
);
