import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure } from "@plutolang/base/closure";
import { IScheduleInfra, Schedule, ScheduleHandler, ScheduleOptions } from "@plutolang/pluto";
import { Lambda } from "./function.lambda";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";

export class CloudWatchSchedule
  extends pulumi.ComponentResource
  implements IResourceInfra, IScheduleInfra
{
  public readonly id: string;

  constructor(name: string, args?: ScheduleOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:queue:aws/CloudWatch", name, args, opts);
    this.id = genResourceId(Schedule.fqn, name);
  }

  public async cron(cron: string, closure: ComputeClosure<ScheduleHandler>): Promise<void> {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    const lambda = new Lambda(closure, /* name */ `${this.id}-${cron}-func`);

    const rule = new aws.cloudwatch.EventRule(
      genAwsResourceName(this.id, "rule"),
      {
        name: genAwsResourceName(this.id, "rule"),
        scheduleExpression: `cron(${convertCronToAwsFmt(cron)})`,
      },
      { parent: this }
    );

    new aws.lambda.Permission(
      genAwsResourceName(this.id, "permission"),
      {
        action: "lambda:InvokeFunction",
        function: lambda.lambdaName,
        principal: "events.amazonaws.com",
        sourceArn: rule.arn,
      },
      { parent: this }
    );

    new aws.cloudwatch.EventTarget(
      genAwsResourceName(this.id, "target"),
      {
        rule: rule.name,
        arn: lambda.lambdaArn,
      },
      { parent: this }
    );
  }

  public grantPermission(op: string) {
    op;
    throw new Error("This method should not be called.");
  }

  public postProcess(): void {}
}

function convertCronToAwsFmt(cron: string): string {
  const parts = cron.split(" ");

  const week = parts[4];
  let fmtWeek: string;
  if (week == "*") {
    fmtWeek = "?";
  } else if (week.indexOf("#") != -1) {
    const nums = week.split("#").map(parseInt);
    if (nums.length > 2) {
      throw new Error("The format is invalid. AWS only supports one '#'");
    }
    fmtWeek = `${nums[0] + 1}#${nums[1] + 1}`;
  } else {
    fmtWeek = `${parseInt(week) + 1}`;
  }

  const fmtCron = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]} ${fmtWeek} *`;
  if (process.env.DEBUG) {
    console.log("Converted cron: ", fmtCron);
  }
  return fmtCron;
}
