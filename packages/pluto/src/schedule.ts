import {
  FnResource,
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
} from "@plutolang/base";

export interface ScheduleHandler extends FnResource {
  (): Promise<void>;
}

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface ScheduleOptions {}

export interface IScheduleClientApi extends IResourceClientApi {}

export interface IScheduleInfraApi extends IResourceInfraApi {
  /**
   * @param cron Cron expressions have six required fields, which are separated by white space.
   *
   * Format: Minutes(0-59) Hours(0-23) Day-of-month(1-31) Month(1-12) Day-of-week(0-6)
   */
  cron(cron: string, fn: ScheduleHandler): Promise<void>;
}
export interface IScheduleCapturedProps extends IResourceCapturedProps {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IScheduleClient = IScheduleClientApi & IScheduleCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IScheduleInfra = IScheduleInfraApi & IScheduleCapturedProps;

export class Schedule implements IResource {
  constructor(name: string, opts?: ScheduleOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static fqn = "@plutolang/pluto.Schedule";
}

export interface Schedule extends IResource, IScheduleClient, IScheduleInfra {}
