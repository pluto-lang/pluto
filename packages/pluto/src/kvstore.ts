import {
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  PlatformType,
  simulator,
  utils,
} from "@plutolang/base";
import { aws, k8s } from "./clients";

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface KVStoreOptions {}

export interface IKVStoreRegularApi {
  readonly awsTableName?: string;
  readonly awsPartitionKey?: string;
}

/**
 * Define the access methods for KVStore that operate during runtime.
 */
export interface IKVStoreClientApi extends IResourceClientApi {
  get(key: string): Promise<string>;
  set(key: string, val: string): Promise<void>;
}

/**
 * Define the methods for KVStore, which operate during compilation.
 */
export interface IKVStoreInfraApi extends IResourceInfraApi {}

export interface IKVStoreCapturedProps extends IResourceCapturedProps {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IKVStoreClient = IKVStoreClientApi & IKVStoreCapturedProps & IKVStoreRegularApi;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IKVStoreInfra = IKVStoreInfraApi & IKVStoreCapturedProps;

// TODO: abstract class
export class KVStore implements IResource {
  constructor(name: string, opts?: KVStoreOptions) {
    name;
    opts;
    throw new Error(
      "cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: KVStoreOptions): IKVStoreClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new aws.DynamoKVStore(name, opts);
      case PlatformType.K8s:
        return new k8s.RedisKVStore(name, opts);
      case PlatformType.Simulator: {
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        const resourceId = utils.genResourceId(KVStore.fqn, name);
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, resourceId);
      }
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }

  public static fqn = "@plutolang/pluto.KVStore";
}

export interface KVStore extends IResource, IKVStoreClient, IKVStoreInfra {}
