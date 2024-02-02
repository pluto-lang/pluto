/**
 * The error thrown inside a user function
 */
export class InvokeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvokeError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}
