import { simulator } from "@plutolang/base";
import { IKVStoreClientApi, KVStoreOptions } from "@plutolang/pluto";

export class SimKVStore implements IKVStoreClientApi, simulator.IResourceInstance {
  private readonly table: Map<string, any>;

  constructor(name: string, opts?: KVStoreOptions) {
    this.table = new Map();
    name;
    opts;
  }

  public async setup(context: simulator.IContext) {
    context;
  }

  public addEventHandler(op: string, args: string, fnResourceId: string): void {
    op;
    args;
    fnResourceId;
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
}
