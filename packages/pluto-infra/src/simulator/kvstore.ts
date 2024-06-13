import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { IKVStoreClient, IKVStoreInfra, KVStore, KVStoreOptions } from "@plutolang/pluto";

export class SimKVStore implements IResourceInfra, IKVStoreClient, IKVStoreInfra {
  public readonly id: string;

  private readonly table: Map<string, any>;

  constructor(name: string, opts?: KVStoreOptions) {
    this.id = genResourceId(KVStore.fqn, name);
    this.table = new Map();
    name;
    opts;
  }

  public addEventHandler(op: string, args: any[]): void {
    op;
    args;
    throw new Error("Method should not be called.");
  }

  public async cleanup(): Promise<void> {}

  public async get(key: string): Promise<string> {
    if (!this.table.has(key)) {
      throw new Error("Key not found");
    }
    return this.table.get(key);
  }

  public async set(key: string, val: string): Promise<void> {
    this.table.set(key, val);
  }

  public grantPermission(): void {}
  public postProcess(): void {}
}
