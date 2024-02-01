import {
  IResource,
  IResourceCapturedProps,
  IResourceInfraApi,
  IResourceClientApi,
  PlatformType,
  utils,
  FnResource,
  simulator,
} from "@plutolang/base";
import { aws, k8s, ali } from "./clients";

export type AnyFunction = (...args: any[]) => any;
export const DEFAULT_FUNCTION_NAME = "default";

/**
 * The interal protocol for the direct call response.
 */
export interface DirectCallResponse {
  // The status code of the response, same as the HTTP status code.
  code: number;
  // The result of the function call, or the error message.
  body: any;
}

interface FunctionHandler extends AnyFunction, FnResource {}

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

export class Function<T extends FunctionHandler> implements IResource {
  constructor(func: T, opts?: FunctionOptions) {
    func;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient<T extends FunctionHandler>(
    func: T,
    opts?: FunctionOptions
  ): IFunctionClient<T> {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new aws.LambdaFunction(func, opts);
      case PlatformType.K8s:
        return new k8s.KnativeService(func, opts);
      case PlatformType.AliCloud:
        return new ali.FCInstance(func, opts);
      case PlatformType.Simulator: {
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        const resourceId = utils.genResourceId(Function.fqn, opts?.name ?? DEFAULT_FUNCTION_NAME);
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, resourceId);
      }
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }

  public static fqn = "@plutolang/pluto.Function";
}

export interface Function<T extends FunctionHandler>
  extends IResource,
    IFunctionClient<T>,
    IFunctionInfra {}
