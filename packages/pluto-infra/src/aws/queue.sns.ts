import { join } from "path";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { SNSHandler } from "aws-lambda";
import { IResourceInfra, LanguageType } from "@plutolang/base";
import { currentLanguage, genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import { CloudEvent, EventHandler, IQueueInfra, Queue, QueueOptions } from "@plutolang/pluto";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";
import { Lambda } from "./function.lambda";
import { Permission } from "./permission";

export enum SNSOps {
  PUSH = "push",
}

export class SNSQueue extends pulumi.ComponentResource implements IResourceInfra, IQueueInfra {
  public readonly id: string;

  private readonly topic: aws.sns.Topic;

  constructor(name: string, options?: QueueOptions) {
    super("pluto:queue:aws/SNS", name, options);
    this.id = genResourceId(Queue.fqn, name);

    this.topic = new aws.sns.Topic(
      genAwsResourceName(this.id),
      {
        name: genAwsResourceName(this.id),
      },
      { parent: this }
    );
  }

  public subscribe(closure: ComputeClosure<EventHandler>): void {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    const awsHandler = adaptPlatformNorm(closure);
    const lambda = new Lambda(awsHandler, { name: `${this.id}-func` });

    // create topic subscription
    new aws.sns.TopicSubscription(
      genAwsResourceName(this.id, "subscription"),
      {
        endpoint: lambda.lambdaArn,
        protocol: "lambda",
        topic: this.topic.arn,
      },
      { parent: this }
    );

    // create sns trigger
    new aws.lambda.Permission(
      genAwsResourceName(this.id, "trigger"),
      {
        action: "lambda:InvokeFunction",
        function: lambda.lambdaName,
        principal: "sns.amazonaws.com",
        sourceArn: this.topic.arn,
      },
      { parent: this }
    );
  }

  public grantPermission(op: string): Permission {
    const actions = [];
    switch (op) {
      case SNSOps.PUSH:
        actions.push("SNS:Publish");
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
    return `arn:aws:sns:*:*:${genAwsResourceName(this.id)}`;
  }
}

/**
 * This function serves to bridge the gap between AWS runtime and Pluto, harmonizing their norms.
 * @param __handler_ The cloud event handler contains the business logic.
 */
function adaptAwsRuntime(__handler_: EventHandler): SNSHandler {
  return async (event, context) => {
    const accountId = context.invokedFunctionArn.split(":")[4];
    process.env["AWS_ACCOUNT_ID"] = accountId;

    for (const record of event.Records) {
      if (!("Sns" in record)) {
        throw new Error(`Unsupported event type ${JSON.stringify(record)}`);
      }

      const payload = record["Sns"]["Message"];
      const event: CloudEvent = JSON.parse(payload);
      console.log("Pluto: Handling event: ", event);
      await __handler_(event).catch((e: Error) => {
        console.log("Faild to handle event: ", e);
      });
    }
  };
}

function adaptPlatformNorm(closure: ComputeClosure<EventHandler>): ComputeClosure<SNSHandler> {
  switch (currentLanguage()) {
    case LanguageType.TypeScript:
      return wrapClosure(adaptAwsRuntime(closure), closure, {
        dirpath: "inline",
        exportName: "handler",
        placeholder: "__handler_",
      });
    case LanguageType.Python:
      return wrapClosure(() => {}, closure, {
        dirpath: join(__dirname, "sns_subscriber_adapter.py"),
        exportName: "handler",
        placeholder: "__handler_",
      });
    default:
      throw new Error(`Unsupported language: ${currentLanguage()}`);
  }
}
