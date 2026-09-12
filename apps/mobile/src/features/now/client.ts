import type { EvidenceGrade, TaskState } from "@repo/schemas";
import { env } from "@/env";

/** Mirrors apps/api's GET /now response — @repo/application's NextActionResult, over JSON. */
export type NextActionResult =
  | { kind: "SELECTED"; task: MobileTask; reason: string }
  | { kind: "TIE"; candidates: MobileTask[] }
  | { kind: "NONE" };

/** Just the fields the Agora screen renders — not the full Prisma Task row. */
export interface MobileTask {
  description: string | null;
  id: string;
  state: TaskState;
  title: string;
}

class NextActionFetchFailedError extends Error {
  constructor(status: number) {
    super(`/now failed: HTTP ${status}`);
    this.name = "NextActionFetchFailedError";
  }
}

export const fetchNextAction = async (
  sessionToken: string
): Promise<NextActionResult> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(new URL("/now", env.EXPO_PUBLIC_API_URL), {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    throw new NextActionFetchFailedError(response.status);
  }
  return (await response.json()) as NextActionResult;
};

class AdvanceTaskFailedError extends Error {
  constructor(status: number, message: string) {
    super(`/now/advance failed: HTTP ${status} — ${message}`);
    this.name = "AdvanceTaskFailedError";
  }
}

export interface AdvanceTaskInput {
  readonly evidence?: {
    readonly description: string;
    readonly grade: EvidenceGrade;
    readonly url?: string;
  };
  readonly taskId: string;
  readonly toState: TaskState;
}

export const advanceTask = async (
  input: AdvanceTaskInput,
  sessionToken: string
): Promise<MobileTask> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(
    new URL("/now/advance", env.EXPO_PUBLIC_API_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(input),
    }
  );
  const body = (await response.json()) as {
    message?: string;
    task?: MobileTask;
  };
  if (!response.ok) {
    throw new AdvanceTaskFailedError(response.status, body.message ?? "");
  }
  if (!body.task) {
    throw new AdvanceTaskFailedError(
      response.status,
      "missing task in response"
    );
  }
  return body.task;
};
