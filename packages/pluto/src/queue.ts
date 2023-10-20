import { FnResource, Resource, runtime } from "@pluto/base";
import { aws, k8s } from "./clients";

export interface CloudEvent {
  timestamp: number;
  data: string;
}

export interface EventHandler extends FnResource {
  (evt: CloudEvent): Promise<void>;
}

/**
 * Define the methods for Queue, which operate during compilation.
 */
export interface QueueInfra {
  subscribe(fn: EventHandler): void;
}
/**
 * Define the access methods for Queue that operate during runtime.
 */
export interface QueueClient {
  push(msg: string): Promise<void>;
}

export interface QueueInfraOptions {}
/**
 * The options for creating a client, which can be used at runtime.
 */
export interface QueueClientOptions {}
export interface QueueOptions extends QueueInfraOptions, QueueClientOptions {}

// TODO: abstract class
export class Queue implements Resource {
  constructor(name: string, opts?: QueueOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: QueueClientOptions): QueueClient {
    const rtType = process.env["RUNTIME_TYPE"];
    switch (rtType) {
      case runtime.Type.AWS:
        return new aws.SNSQueue(name, opts);
      case runtime.Type.K8s:
        return new k8s.RedisQueue(name, opts);
      default:
        throw new Error(`not support this runtime '${rtType}'`);
    }
  }
}

export interface Queue extends QueueInfra, QueueClient {
  new (name: string, opts?: QueueOptions): Queue;
}
