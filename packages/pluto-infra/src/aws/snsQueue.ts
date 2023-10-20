import { assert } from "console";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Resource, ResourceInfra } from "@pluto/base";
import { QueueInfra, QueueInfraOptions } from "@pluto/pluto/dist/queue";
import { Lambda } from "./lambda";

export enum SNSOps {
  PUSH = "push",
}

export class SNSQueue extends pulumi.ComponentResource implements ResourceInfra, QueueInfra {
  readonly name: string;
  topic: aws.sns.Topic;

  constructor(name: string, opts?: QueueInfraOptions) {
    super("pluto:queue:aws/SNS", name, opts);
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

  public subscribe(fn: Resource): void {
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

  public getPermission(op: string): any {
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
