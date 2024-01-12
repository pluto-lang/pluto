import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { IKVStoreClient, KVStoreOptions } from "../../kvstore";

/**
 * Implementation of KVStore using AWS DynamoDB.
 */
export class DynamoKVStore implements IKVStoreClient {
  private tableName: string;
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;

  constructor(name: string, opts?: KVStoreOptions) {
    this.tableName = name;
    this.client = new DynamoDBClient();
    this.docClient = DynamoDBDocumentClient.from(this.client);
    opts;
  }

  public async get(key: string): Promise<string> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          Id: key,
        },
      })
    );
    if (result.Item == undefined) {
      throw new Error(`There is no target key-value pair, Key: ${key}.`);
    }
    return result.Item["Value"];
  }

  public async set(key: string, val: string): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        Id: key,
        Value: val,
      },
    });
    await this.docClient.send(command);
  }
}
