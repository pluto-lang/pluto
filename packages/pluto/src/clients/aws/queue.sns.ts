import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { genResourceId } from "@plutolang/base/utils";
import { CloudEvent, IQueueClient, Queue, QueueOptions } from "../../queue";
import { genAwsResourceName, getAwsAccountId } from "./utils";

/**
 * Implementation of Queue using AWS SNS.
 */
export class SNSQueue implements IQueueClient {
  private readonly id: string;
  private readonly topicArn: Promise<string>;

  private client: SNSClient;

  constructor(name: string, opts?: QueueOptions) {
    this.id = genResourceId(Queue.fqn, name);

    const topicName = genAwsResourceName(this.id);
    this.topicArn = this.buildARN(topicName);
    this.client = new SNSClient({});
    opts;
  }

  public async push(msg: string): Promise<void> {
    const evt: CloudEvent = {
      timestamp: Date.now(),
      data: msg,
    };
    await this.client.send(
      new PublishCommand({
        TopicArn: await this.topicArn,
        Message: JSON.stringify(evt),
      })
    );
  }

  private async buildARN(topicName: string): Promise<string> {
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error("Missing AWS Region");
    }

    const accountId = await getAwsAccountId();

    return `arn:aws:sns:${region}:${accountId}:${topicName}`;
  }
}
