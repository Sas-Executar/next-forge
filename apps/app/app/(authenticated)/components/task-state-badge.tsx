import { Badge } from "@repo/design-system/components/ui/badge";
import type { TaskState } from "@repo/schemas";
import { TASK_STATE_LABEL_PT } from "@repo/schemas";

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
