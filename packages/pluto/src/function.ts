import {
  IResource,
  IResourceCapturedProps,
  IResourceInfraApi,
  IResourceClientApi,
  PlatformType,
  utils,
} from "@plutolang/base";
import { aws } from "./clients";

export type AnyFunction = (...args: any[]) => any;
export const DEFAULT_FUNCTION_NAME = "default";

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface FunctionOptions {
  name?: string;
  envs?: Record<string, any>;
}

export interface IFunctionClientApi<T extends AnyFunction> extends IResourceClientApi {
  invoke(...args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>>;
}

export interface IFunctionInfraApi extends IResourceInfraApi {}

export interface IFunctionCapturedProps extends IResourceCapturedProps {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IFunctionClient<T extends AnyFunction> = IFunctionClientApi<T> & IFunctionCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IFunctionInfra = IFunctionInfraApi & IFunctionCapturedProps;

export class Function<T extends AnyFunction> implements IResource {
  constructor(func: T, opts?: FunctionOptions) {
    func;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient<T extends AnyFunction>(
    func: T,
    opts?: FunctionOptions
  ): IFunctionClient<T> {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new aws.LambdaFunction(func, opts);
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }

  public static fqn = "@plutolang/pluto.Function";
}

export interface Function<T extends AnyFunction>
  extends IResource,
    IFunctionClient<T>,
    IFunctionInfra {}
