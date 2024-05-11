import { ProvisionType, PlatformType, utils, IResourceInfra } from "@plutolang/base";
import { IWebsiteInfra, WebsiteOptions } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

type IWebsiteInfraImpl = IWebsiteInfra & IResourceInfra;

// Construct a type for a class constructor. The key point is that the parameters of the constructor
// must be consistent with the client class of this resource type. Use this type to ensure that
// all implementation classes have the correct and same constructor signature.
type WebsiteInfraImplClass = new (
  path: string,
  name?: string,
  options?: WebsiteOptions
) => IWebsiteInfraImpl;

// Construct a map that contains all the implementation classes for this resource type.
// The final selection will be determined at runtime, and the class will be imported lazily.
const implClassMap = new ImplClassMap<IWebsiteInfraImpl, WebsiteInfraImplClass>(
  "@plutolang/pluto.Website",
  {
    [ProvisionType.Pulumi]: {
      [PlatformType.AWS]: async () => (await import("./aws")).Website,
    },
  }
);

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and provisioning engine.
 */
export abstract class Website {
  /**
   * Asynchronously creates an instance of the Website infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(
    path: string,
    name?: string,
    options?: WebsiteOptions
  ): Promise<IWebsiteInfraImpl> {
    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      path,
      name,
      options
    );
  }
}
