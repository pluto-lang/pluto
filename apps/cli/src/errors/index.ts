export class ExitError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "ExitError";
  }
}
