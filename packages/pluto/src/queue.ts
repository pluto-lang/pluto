import {
  FnResource,
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  runtime,
  simulator,
} from "@plutolang/base";
import { aws, k8s } from "./clients";

export interface CloudEvent {
  timestamp: number;
  data: string;
}

export interface EventHandler extends FnResource {
  (evt: CloudEvent): Promise<void>;
}

export interface IQueueCapturedProps extends IResourceCapturedProps {}

/**
 * Define the methods for Queue, which operate during compilation.
 */
export interface IQueueInfraApi extends IResourceInfraApi {
  subscribe(fn: EventHandler): void;
}
/**
 * Define the access methods for Queue that operate during runtime.
 */
export interface IQueueClientApi extends IResourceClientApi {
  push(msg: string): Promise<void>;
}

export interface QueueInfraOptions {}
/**
 * The options for creating a client, which can be used at runtime.
 */
export interface QueueClientOptions {}
export interface QueueOptions extends QueueInfraOptions, QueueClientOptions {}

// TODO: abstract class
export class Queue implements IResource {
  constructor(name: string, opts?: QueueOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: QueueClientOptions): IQueueClientApi {
    const rtType = process.env["RUNTIME_TYPE"];
    switch (rtType) {
      case runtime.Type.AWS:
        return new aws.SNSQueue(name, opts);
      case runtime.Type.K8s:
        return new k8s.RedisQueue(name, opts);
      case runtime.Type.Simulator:
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, name);
      default:
        throw new Error(`not support this runtime '${rtType}'`);
    }
  }
}

export interface Queue extends IQueueInfraApi, IQueueClientApi, IQueueCapturedProps, IResource {}
