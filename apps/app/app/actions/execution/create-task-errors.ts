export class IllegalInitialStateError extends Error {
  constructor(decision: string) {
    super(`Task creation was not authorized (AuthorityGate: ${decision}).`);
    this.name = "IllegalInitialStateError";
  }
}
