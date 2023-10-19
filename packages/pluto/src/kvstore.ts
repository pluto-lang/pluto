import { Resource, runtime } from "@pluto/base";
import { aws } from "./clients";

/**
 * Define the methods for KVStore, which operate during compilation.
 */
export interface KVStoreInfra {}
/**
 * Define the access methods for KVStore that operate during runtime.
 */
export interface KVStoreClient {
  get(key: string): Promise<string>;
  set(key: string, val: string): Promise<void>;
}

export interface KVStoreInfraOptions {}
/**
 * The options for creating a client, which can be used at runtime.
 */
export interface KVStoreClientOptions {}

export interface KVStoreOptions extends KVStoreInfraOptions, KVStoreClientOptions {}

// TODO: abstract class
export class KVStore implements Resource {
  constructor(name: string, opts?: KVStoreOptions) {
    name;
    opts;
    throw new Error(
      "cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: KVStoreClientOptions): KVStoreClient {
    const rtType = process.env["RUNTIME_TYPE"];
    switch (rtType) {
      case runtime.Type.AWS:
        return new aws.DynamoKVStore(name, opts);
      default:
        throw new Error(`not support this runtime '${rtType}'`);
    }
  }
}

export interface KVStore extends KVStoreInfra, KVStoreClient {}
