import { Card, CardContent } from "@repo/design-system/components/ui/card";
import type { Task } from "@repo/database";
import type { TaskState } from "@repo/schemas";
import { TASK_STATE_LABEL_PT, TaskStateBadge } from "./task-state-badge";

export type TaskWithContext = Pick<Task, "id" | "title" | "state"> & {
  /** Shown per-card only in Remix (multi-project) scope — SPEC-WORKSPACE-001
   * §4: aggregated tasks stay visibly attributed to their real project,
   * never merged into a synthetic one. */
  projectName?: string;
  dependsOnTitles?: string[];
};

interface TaskListViewProperties {
  readonly tasks: readonly TaskWithContext[];
  readonly view: "lista" | "kanban";
}

// Every state that appears anywhere in the canonical chain, in the
// chain's own order (packages/schemas/src/task-state.ts) — Kanban
// columns are the state machine, not an arbitrary UI grouping.
const KANBAN_COLUMNS: readonly TaskState[] = [
  "BACKLOG_VALIDATED",
  "READY",
  "DOING",
  "VERIFY",
  "DONE",
  "BLOCKED",
];

const TaskCard = ({ task }: { task: TaskWithContext }) => (
  <Card>
    <CardContent className="flex items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{task.title}</p>
        {task.projectName && (
          <p className="truncate text-muted-foreground text-xs">
            {task.projectName}
          </p>
        )}
        {task.dependsOnTitles && task.dependsOnTitles.length > 0 && (
          <p className="truncate text-muted-foreground text-xs">
            depende de: {task.dependsOnTitles.join(", ")}
          </p>
        )}
      </div>
      <TaskStateBadge state={task.state} />
    </CardContent>
  </Card>
);

/**
 * Lista (ordered, read-only — does not alter state) and Kanban (grouped
 * by state/stage) view modes, per SPEC-WORKSPACE-001 §3. WIP 1:1 is a
 * separate, single-task view (see /now) — not rendered by this
 * component.
 */
export const TaskListView = ({ tasks, view }: TaskListViewProperties) => {
  if (view === "lista") {
    return (
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  }

  const tasksByState = new Map<TaskState, TaskWithContext[]>(
    KANBAN_COLUMNS.map((state) => [state, []])
  );
  for (const task of tasks) {
    tasksByState.get(task.state)?.push(task);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((state) => {
        const columnTasks = tasksByState.get(state) ?? [];
        return (
          <div className="flex w-64 shrink-0 flex-col gap-2" key={state}>
            <p className="font-medium text-muted-foreground text-sm">
              {TASK_STATE_LABEL_PT[state]} ({columnTasks.length})
            </p>
            <div className="flex flex-col gap-2">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
