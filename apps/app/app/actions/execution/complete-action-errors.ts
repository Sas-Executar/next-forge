export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task ${taskId} not found in this workspace.`);
    this.name = "TaskNotFoundError";
  }
}

export class IllegalTransitionError extends Error {
  constructor(from: string, to: string, decision: string) {
    super(`${from} -> ${to} was not authorized (AuthorityGate: ${decision}).`);
    this.name = "IllegalTransitionError";
  }
}

export class MissingEvidenceError extends Error {
  constructor(taskId: string) {
    super(
      `Task ${taskId}: DONE requires evidence — "feito" não substitui evidência.`
    );
    this.name = "MissingEvidenceError";
  }
}
