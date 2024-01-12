import {
  IResource,
  IResourceCapturedProps,
  IResourceInfraApi,
  runtime,
  simulator,
  utils,
} from "@plutolang/base";
import { IResourceClientApi } from "@plutolang/base";

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface FunctionOptions {
  envs?: Record<string, any>;
}

export interface IFunctionClientApi extends IResourceClientApi {
  invoke(payload: string): Promise<string>;
}

export interface IFunctionInfraApi extends IResourceInfraApi {}

export interface IFunctionCapturedProps extends IResourceCapturedProps {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IFunctionClient = IFunctionClientApi & IFunctionCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IFunctionInfra = IFunctionInfraApi & IFunctionCapturedProps;

export class Function implements IResource {
  constructor(name: string, opts?: FunctionOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: FunctionOptions): IFunctionClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case runtime.Type.Simulator:
        opts;
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, name);
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }
}

export interface Function extends IResource, IFunctionClient, IFunctionInfra {}
