import { simulator } from "@plutolang/base";
import { SimFunction } from "./function";
import { CloudEvent, QueueClient, QueueClientOptions } from "@plutolang/pluto";

export class SimQueue implements QueueClient, simulator.IResourceInstance {
  readonly topicName: string;
  private readonly messages: CloudEvent[];
  private subscriber?: string;
  private context?: simulator.IContext;

  constructor(name: string, opts?: QueueClientOptions) {
    this.topicName = name;
    this.messages = [];
    opts;
  }

  public async setup(context: simulator.IContext) {
    this.context = context;
  }

  public addEventHandler(op: string, args: string, fnResourceId: string): void {
    if (this.subscriber) {
      throw new Error("There can only be one subscriber for each message queue.");
    }
    this.subscriber = fnResourceId;
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
    const fnClient = this.context!.findInstance(this.subscriber) as SimFunction;
    await fnClient.invoke(JSON.stringify(evt));
  }
}
