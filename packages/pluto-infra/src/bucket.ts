import { ProvisionType, PlatformType, utils, IResourceInfra } from "@plutolang/base";
import { IBucketInfra, BucketOptions } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

type IBucketInfraImpl = IBucketInfra & IResourceInfra;

// Construct a type for a class constructor. The key point is that the parameters of the constructor
// must be consistent with the client class of this resource type. Use this type to ensure that
// all implementation classes have the correct and same constructor signature.
type BucketInfraImplClass = new (name: string, options?: BucketOptions) => IBucketInfraImpl;

// Construct a map that contains all the implementation classes for this resource type.
// The final selection will be determined at runtime, and the class will be imported lazily.
const implClassMap = new ImplClassMap<IBucketInfraImpl, BucketInfraImplClass>(
  "@plutolang/pluto.Bucket",
  {
    [ProvisionType.Pulumi]: {
      [PlatformType.AWS]: async () => (await import("./aws")).S3Bucket,
    },
  }
);

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and provisioning engine.
 */
export abstract class Bucket {
  /**
   * Asynchronously creates an instance of the bucket infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(
    name: string,
    options?: BucketOptions
  ): Promise<IBucketInfraImpl> {
    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      name,
      options
    );
  }
}
