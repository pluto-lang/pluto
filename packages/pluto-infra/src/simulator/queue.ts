import { IResourceInfra } from "@plutolang/base";
import { ComputeClosure } from "@plutolang/base/closure";
import { genResourceId } from "@plutolang/base/utils";
import {
  Queue,
  CloudEvent,
  EventHandler,
  IQueueClient,
  IQueueInfra,
  QueueOptions,
} from "@plutolang/pluto";
import { SimFunction } from "./function";

export class SimQueue implements IResourceInfra, IQueueInfra, IQueueClient {
  public readonly id: string;

  public readonly topicName: string;
  private readonly messages: CloudEvent[];
  private subscriber?: SimFunction;

  constructor(name: string, opts?: QueueOptions) {
    this.id = genResourceId(Queue.fqn, name);

    this.topicName = name;
    this.messages = [];
    opts;
  }

  public subscribe(subscriber: ComputeClosure<EventHandler>): void {
    if (this.subscriber) {
      throw new Error("There can only be one subscriber for each message queue.");
    }
    this.subscriber = new SimFunction(subscriber);
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
    await this.subscriber.invoke(evt);
  }

  public grantPermission(): void {}
  public postProcess(): void {}
}
