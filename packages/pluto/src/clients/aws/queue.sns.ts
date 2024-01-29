import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { genResourceId } from "@plutolang/base/utils";
import { CloudEvent, IQueueClient, Queue, QueueOptions } from "../../queue";
import { genAwsResourceName } from "./utils";

/**
 * Implementation of Queue using AWS SNS.
 */
export class SNSQueue implements IQueueClient {
  private readonly id: string;
  private readonly topicArn: string;

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
        TopicArn: this.topicArn,
        Message: JSON.stringify(evt),
      })
    );
  }

  private buildARN(topicName: string): string {
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error("Missing AWS Region");
    }

    const accountId = process.env.AWS_ACCOUNT_ID;
    if (!accountId) {
      throw new Error("Missing AWS Account ID");
    }

    return `arn:aws:sns:${region}:${accountId}:${topicName}`;
  }
}
