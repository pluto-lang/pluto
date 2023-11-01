import { FnResource, Resource } from "@plutolang/base";

export interface Handler extends FnResource {
  (): Promise<void>;
}

export interface ScheduleInfra {
  /**
   * @param cron Cron expressions have six required fields, which are separated by white space.
   *
   * Format: Minutes(0-59) Hours(0-23) Day-of-month(1-31) Month(1-12) Day-of-week(0-6)
   */
  cron(cron: string, fn: Handler): Promise<void>;
}

export interface ScheduleInfraOptions {}

export interface ScheduleOptions extends ScheduleInfraOptions {}

export class Schedule implements Resource {
  constructor(name: string, opts?: ScheduleOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }
}

export interface Schedule extends ScheduleInfra, Resource {}
