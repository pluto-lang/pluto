import {
  FnResource,
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  PlatformType,
  simulator,
  utils,
} from "@plutolang/base";
import { aws, k8s } from "./clients";

export interface CloudEvent {
  timestamp: number;
  data: string;
}

export interface EventHandler extends FnResource {
  (evt: CloudEvent): Promise<void>;
}

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface QueueOptions {}

/**
 * Define the access methods for Queue that operate during runtime.
 */
export interface IQueueClientApi extends IResourceClientApi {
  push(msg: string): Promise<void>;
}

/**
 * Define the methods for Queue, which operate during compilation.
 */
export interface IQueueInfraApi extends IResourceInfraApi {
  subscribe(fn: EventHandler): void;
}

/**
 * Define the properties for Queue that are captured at compile time and accessed during runtime.
 */
export interface IQueueCapturedProps extends IResourceCapturedProps {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IQueueClient = IQueueClientApi & IQueueCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IQueueInfra = IQueueInfraApi & IQueueCapturedProps;

// TODO: abstract class
export class Queue implements IResource {
  constructor(name: string, opts?: QueueOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: QueueOptions): IQueueClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new aws.SNSQueue(name, opts);
      case PlatformType.K8s:
        return new k8s.RedisQueue(name, opts);
      case PlatformType.Simulator:
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        const resourceId = utils.genResourceId(Queue.fqn, name);
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, resourceId);
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }

  public static fqn = "@plutolang/pluto.Queue";
}

export interface Queue extends IResource, IQueueClient, IQueueInfra {}
