import { createClient, RedisClientType } from "redis";
import { KVStoreClient, KVStoreClientOptions } from "../../kvstore";

export class RedisKVStore implements KVStoreClient {
  readonly tableName: string;
  client: RedisClientType;

  constructor(name: string, opts?: KVStoreClientOptions) {
    this.tableName = name;
    // TODO: Make namespace configurable.
    const host = `${this.tableName}-kvstore.default.svc.cluster.local`;
    this.client = createClient({
      url: `redis://default:${this.tableName}-redis-password@${host}:6379`,
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
