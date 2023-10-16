import { runtime } from "@pluto/base";
import { aws } from "./clients";

/**
 * Define the methods for Lambda, which operate during compilation.
 */
export interface LambdaInfra {}
/**
 * Define the access methods for Lambda that operate during runtime.
 */
export interface LambdaClient {
  invoke(msg: string): Promise<void>;
}

export interface LambdaInfraOptions {}
/**
 * The options for creating a client, which can be used at runtime.
 */
export interface LambdaClientOptions {}
export interface LambdaOptions extends LambdaInfraOptions, LambdaClientOptions {}

// TODO: abstract class
export class Lambda {
  constructor(name: string, opts?: LambdaOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: LambdaClientOptions): LambdaClient {
    const rtType = process.env["RUNTIME_TYPE"];
    switch (rtType) {
      case runtime.Type.AWS:
        return new aws.Lambda(name, opts);
      default:
        throw new Error(`Not support this runtime '${rtType}'`);
    }
  }
}

export interface Lambda extends LambdaInfra, LambdaClient {}
