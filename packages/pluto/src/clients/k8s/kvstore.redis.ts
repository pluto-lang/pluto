import { createClient, RedisClientType } from "redis";
import { IKVStoreClient, KVStore, KVStoreOptions } from "../../kvstore";
import { genResourceId } from "@plutolang/base/utils";
import { genK8sResourceName } from "./utils";

export class RedisKVStore implements IKVStoreClient {
  private readonly id: string;
  private client: RedisClientType;

  constructor(name: string, opts?: KVStoreOptions) {
    this.id = genResourceId(KVStore.fqn, name);
    const serviceName = genK8sResourceName(this.id, "service");
    // TODO: Make namespace configurable.
    const host = `${serviceName}.default.svc.cluster.local`;
    this.client = createClient({
      url: `redis://default:${this.id}-redis-password@${host}:6379`,
    });
    opts;
  }

  public async get(key: string): Promise<string> {
    await this.client.connect();
    const value = await this.client.get(key);
    await this.client.disconnect();
    if (value == null) {
      throw new Error("Key not found");
    }
    return value;
  }

  public async set(key: string, val: string): Promise<void> {
    await this.client.connect();
    await this.client.set(key, val);
    await this.client.disconnect();
  }
}
