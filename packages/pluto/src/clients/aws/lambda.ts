import { LambdaClient, LambdaClientOptions } from "../../lambda";

/**
 * Implementation of Lambda using AWS Lambda.
 */
export class Lambda implements LambdaClient {
  constructor(name: string, opts?: LambdaClientOptions) {
    name;
    opts;
  }

  public invoke(msg: string): Promise<void> {
    msg;
    throw new Error("Method not implemented.");
  }
}
