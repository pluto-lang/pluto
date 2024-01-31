import { simulator } from "@plutolang/base";
import { CloudEvent, EventHandler, IQueueClient, QueueOptions } from "@plutolang/pluto";

export class SimQueue implements IQueueClient, simulator.IResourceInstance {
  readonly topicName: string;
  private readonly messages: CloudEvent[];
  private subscriber?: EventHandler;

  constructor(name: string, opts?: QueueOptions) {
    this.topicName = name;
    this.messages = [];
    opts;
  }

  public addEventHandler(op: string, args: any[]): void {
    if (this.subscriber) {
      throw new Error("There can only be one subscriber for each message queue.");
    }
    this.subscriber = args[0];
    op;
    args;
  }

  public async cleanup(): Promise<void> {}

  public async push(msg: string): Promise<void> {
    const evt: CloudEvent = {
      timestamp: Date.now(),
      data: msg,
    };
    this.messages.push(evt);

    if (!this.subscriber) {
      throw new Error("No subscriber for message queue.");
    }
    await this.subscriber(evt);
  }
}
