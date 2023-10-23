import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Resource, ResourceInfra } from "@plutolang/base";
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

  public async cron(cron: string, fn: Resource): Promise<void> {
    if (!(fn instanceof Lambda)) {
      throw new Error("Fn is not a subclass of LambdaDef.");
    }

    const rule = new aws.cloudwatch.EventRule(
      `${this.name}-rule`,
      {
        name: `${this.name}-rule`,
        scheduleExpression: `cron(${cron})`,
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
