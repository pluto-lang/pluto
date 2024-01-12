import { assert } from "console";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { IResource, ResourceInfra } from "@plutolang/base";
import { IQueueInfra, QueueOptions } from "@plutolang/pluto";
import { Lambda } from "./function.lambda";
import { Permission } from "./permission";

export enum SNSOps {
  PUSH = "push",
}

export class SNSQueue extends pulumi.ComponentResource implements ResourceInfra, IQueueInfra {
  readonly name: string;
  topic: aws.sns.Topic;

  constructor(name: string, options?: QueueOptions) {
    super("pluto:queue:aws/SNS", name, options);
    this.name = name;

    this.topic = new aws.sns.Topic(
      name,
      {
        name: name,
        tags: {
          "dapr-topic-name": name,
        },
      },
      { parent: this }
    );
  }

  public subscribe(fn: IResource): void {
    assert(fn instanceof Lambda, "Fn is not a subclass of LambdaDef.");
    const lambda = fn as Lambda;

    const resourceNamePrefix = `${this.name}-${lambda.name}`;

    // create topic subscription
    new aws.sns.TopicSubscription(
      `${resourceNamePrefix}-subscription`,
      {
        endpoint: lambda.lambda.arn,
        protocol: "lambda",
        topic: this.topic.arn,
      },
      { parent: this }
    );

    // create sns trigger
    new aws.lambda.Permission(
      `${resourceNamePrefix}-httpTrigger`,
      {
        action: "lambda:InvokeFunction",
        function: lambda.lambda.name,
        principal: "sns.amazonaws.com",
        sourceArn: this.topic.arn,
      },
      { parent: this }
    );
  }

  public getPermission(op: string): Permission {
    const actions = [];
    switch (op) {
      case SNSOps.PUSH:
        actions.push("sns:*");
        break;
      default:
        throw new Error(`Unknown operation: ${op}`);
    }

    return {
      effect: "Allow",
      actions: actions,
      resources: [this.fuzzyArn()],
    };
  }

  public postProcess() {}

  private fuzzyArn() {
    return `arn:aws:sns:*:*:${this.name}`;
  }
}
