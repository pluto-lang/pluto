import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { IResource, ResourceInfra } from "@plutolang/base";
import { ScheduleInfra } from "@plutolang/pluto";
import { ScheduleInfraOptions } from "@plutolang/pluto/dist/schedule";
import { Lambda } from "./lambda";

export class CloudWatchSchedule
  extends pulumi.ComponentResource
  implements ScheduleInfra, ResourceInfra
{
  readonly name: string;

  constructor(name: string, args?: ScheduleInfraOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:queue:aws/CloudWatch", name, args, opts);
    this.name = name;
  }

  public async cron(cron: string, fn: IResource): Promise<void> {
    if (!(fn instanceof Lambda)) {
      throw new Error("Fn is not a subclass of LambdaDef.");
    }

    const rule = new aws.cloudwatch.EventRule(
      `${this.name}-rule`,
      {
        name: `${this.name}-rule`,
        scheduleExpression: `cron(${convertCronToAwsFmt(cron)})`,
      },
      { parent: this }
    );

    new aws.lambda.Permission(
      `${this.name}-lmd-perm`,
      {
        action: "lambda:InvokeFunction",
        function: fn.lambda.name,
        principal: "events.amazonaws.com",
        sourceArn: rule.arn,
      },
      { parent: this }
    );

    new aws.cloudwatch.EventTarget(
      `${this.name}-target`,
      {
        rule: rule.name,
        arn: fn.lambda.arn,
      },
      { parent: this }
    );
  }

  public getPermission(op: string) {
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
