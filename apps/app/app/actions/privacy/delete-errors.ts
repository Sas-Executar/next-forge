export class ConfirmationMismatchError extends Error {
  constructor() {
    super(
      "Confirmation text does not match the workspace name — nothing was deleted."
    );
    this.name = "ConfirmationMismatchError";
  }
}
