import { ProvisionType, PlatformType, utils, IResourceInfra } from "@plutolang/base";
import { IKVStoreInfra, KVStoreOptions } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

type IKVStoreInfraImpl = IKVStoreInfra & IResourceInfra;

// Construct a type for a class constructor. The key point is that the parameters of the constructor
// must be consistent with the client class of this resource type. Use this type to ensure that
// all implementation classes have the correct and same constructor signature.
type KVStoreInfraImplClass = new (name: string, options?: KVStoreOptions) => IKVStoreInfraImpl;

// Construct a map that contains all the implementation classes for this resource type.
// The final selection will be determined at runtime, and the class will be imported lazily.
const implClassMap = new ImplClassMap<IKVStoreInfraImpl, KVStoreInfraImplClass>(
  "@plutolang/pluto.KVStore",
  {
    [ProvisionType.Pulumi]: {
      [PlatformType.AWS]: async () => (await import("./aws")).DynamoKVStore,
      [PlatformType.K8s]: async () => (await import("./k8s")).RedisKVStore,
    },
  }
);

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and provisioning engine.
 */
export abstract class KVStore {
  /**
   * Asynchronously creates an instance of the kvstore infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(
    name: string,
    options?: KVStoreOptions
  ): Promise<IKVStoreInfraImpl> {
    // TODO: ensure that the resource implementation class for the simulator has identical methods as those for the cloud.
    if (
      utils.currentPlatformType() === PlatformType.Simulator &&
      utils.currentEngineType() === ProvisionType.Simulator
    ) {
      return new (await import("./simulator")).SimKVStore(name, options) as any;
    }

    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      name,
      options
    );
  }
}
