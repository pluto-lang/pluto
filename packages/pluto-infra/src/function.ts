import { ProvisionType, PlatformType, utils, IResourceInfra } from "@plutolang/base";
import { ComputeClosure } from "@plutolang/base/closure";
import { IFunctionInfra, FunctionOptions, AnyFunction } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

export type IFunctionInfraImpl = IFunctionInfra & IResourceInfra;

// Construct a type for a class constructor. The key point is that the parameters of the constructor
// must be consistent with the client class of this resource type. Use this type to ensure that
// all implementation classes have the correct and same constructor signature.
type FunctionInfraImplClass = new (
  func: ComputeClosure<AnyFunction>,
  name?: string,
  options?: FunctionOptions
) => IFunctionInfraImpl;

// Construct a map that contains all the implementation classes for this resource type.
// The final selection will be determined at runtime, and the class will be imported lazily.
const implClassMap = new ImplClassMap<IFunctionInfraImpl, FunctionInfraImplClass>(
  "@plutolang/pluto.Function",
  {
    [ProvisionType.Pulumi]: {
      [PlatformType.AWS]: async () => (await import("./aws")).Lambda,
      [PlatformType.K8s]: async () => (await import("./k8s")).KnativeService,
      [PlatformType.AliCloud]: async () => (await import("./alicloud")).FCInstance,
    },
    [ProvisionType.Simulator]: {
      [PlatformType.Simulator]: async () => (await import("./simulator")).SimFunction,
    },
  }
);

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and provisioning engine.
 */
export abstract class Function {
  /**
   * Asynchronously creates an instance of the function infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(
    func: ComputeClosure<AnyFunction>,
    name?: string,
    options?: FunctionOptions
  ): Promise<IFunctionInfraImpl> {
    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      func,
      name,
      options
    );
  }
}
