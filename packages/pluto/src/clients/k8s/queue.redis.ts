import { createClient, RedisClientType } from "redis";
import { CloudEvent, IQueueClient, QueueOptions } from "../../queue";

export class RedisQueue implements IQueueClient {
  readonly topicName: string;
  client: RedisClientType;

  constructor(name: string, opts?: QueueOptions) {
    this.topicName = name;
    // TODO: Make namespace configurable.
    const host = `${this.topicName}-queue.default.svc.cluster.local`;
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
    await this.client.xAdd(this.topicName, "*", { data: JSON.stringify(evt) });
    await this.client.disconnect();
  }
}
