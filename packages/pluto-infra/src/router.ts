import { ProvisionType, PlatformType, utils, IResourceInfra } from "@plutolang/base";
import { IRouterInfra, RouterOptions } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

type IRouterInfraImpl = IRouterInfra & IResourceInfra;

// Construct a type for a class constructor. The key point is that the parameters of the constructor
// must be consistent with the client class of this resource type. Use this type to ensure that
// all implementation classes have the correct and same constructor signature.
type RouterInfraImplClass = new (name: string, options?: RouterOptions) => IRouterInfraImpl;

// Construct a map that contains all the implementation classes for this resource type.
// The final selection will be determined at runtime, and the class will be imported lazily.
const implClassMap = new ImplClassMap<IRouterInfraImpl, RouterInfraImplClass>(
  "@plutolang/pluto.Router",
  {
    [ProvisionType.Pulumi]: {
      [PlatformType.AWS]: async () => (await import("./aws")).ApiGatewayRouter,
      [PlatformType.K8s]: async () => (await import("./k8s")).IngressRouter,
      [PlatformType.AliCloud]: async () => (await import("./alicloud")).AppRouter,
    },
    [ProvisionType.Simulator]: {
      [PlatformType.Simulator]: async () => (await import("./simulator")).SimRouter,
    },
  }
);

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and provisioning engine.
 */
export abstract class Router {
  /**
   * Asynchronously creates an instance of the router infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(
    name: string,
    options?: RouterOptions
  ): Promise<IRouterInfraImpl> {
    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      name,
      options
    );
  }
}
