import { createClient, RedisClientType } from "redis";
import { CloudEvent, IQueueClient, Queue, QueueOptions } from "../../queue";
import { genResourceId } from "@plutolang/base/utils";
import { genK8sResourceName } from "./utils";

export class RedisQueue implements IQueueClient {
  private readonly id: string;
  private client: RedisClientType;

  constructor(name: string, opts?: QueueOptions) {
    this.id = genResourceId(Queue.fqn, name);
    const serviceName = genK8sResourceName(this.id, "service");
    // TODO: Make namespace configurable.
    const host = `${serviceName}.default.svc.cluster.local`;
    this.client = createClient({
      url: `redis://${host}:6379`,
    });
    opts;
  }

  public async push(msg: string): Promise<void> {
    const evt: CloudEvent = {
      timestamp: Date.now(),
      data: msg,
    };
    await this.client.connect();
    await this.client.xAdd(this.id, "*", { data: JSON.stringify(evt) });
    await this.client.disconnect();
  }
}
