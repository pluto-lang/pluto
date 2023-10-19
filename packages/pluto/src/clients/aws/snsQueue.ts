import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { QueueClient, QueueClientOptions } from "../../queue";

/**
 * Implementation of Queue using AWS SNS.
 */
export class SNSQueue implements QueueClient {
  private topicName: string;
  private client: SNSClient;

  constructor(name: string, opts?: QueueClientOptions) {
    this.topicName = name;
    this.client = new SNSClient({});
    opts;
  }

  public async push(msg: string): Promise<void> {
    await this.client.send(
      new PublishCommand({
        TopicArn: this.buildARN(this.topicName),
        Message: msg,
      })
    );
  }

  private buildARN(topicName: string): string {
    // TODO: build the accurate ARN.
    return `arn:aws:sns:*:*:${topicName}`;
  }
}
