import { ExitError } from "../errors";

export function handleIquirerError(): any {
  throw new ExitError();
}
