import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { CloudEvent, IQueueClientApi, QueueClientOptions } from "../../queue";

/**
 * Implementation of Queue using AWS SNS.
 */
export class SNSQueue implements IQueueClientApi {
  private topicName: string;
  private client: SNSClient;

  constructor(name: string, opts?: QueueClientOptions) {
    this.topicName = name;
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
        TopicArn: this.buildARN(this.topicName),
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
