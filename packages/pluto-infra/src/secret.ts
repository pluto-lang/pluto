import { ProvisionType, PlatformType, utils, IResourceInfra } from "@plutolang/base";
import { ISecretInfra } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

type ISecretInfraImpl = ISecretInfra & IResourceInfra;

// Construct a type for a class constructor. The key point is that the parameters of the constructor
// must be consistent with the client class of this resource type. Use this type to ensure that
// all implementation classes have the correct and same constructor signature.
type SecretInfraImplClass = new (name: string, value: string) => ISecretInfraImpl;

// Construct a map that contains all the implementation classes for this resource type.
// The final selection will be determined at runtime, and the class will be imported lazily.
const implClassMap = new ImplClassMap<ISecretInfraImpl, SecretInfraImplClass>(
  "@plutolang/pluto.Secret",
  {
    [ProvisionType.Pulumi]: {
      [PlatformType.AWS]: async () => (await import("./aws")).Secret,
    },
  }
);

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and provisioning engine.
 */
export abstract class Secret {
  /**
   * Asynchronously creates an instance of the secret infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(name: string, value: string): Promise<ISecretInfraImpl> {
    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      name,
      value
    );
  }
}
