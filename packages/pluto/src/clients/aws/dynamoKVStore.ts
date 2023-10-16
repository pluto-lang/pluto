import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { KVStoreClient, KVStoreClientOptions } from "../../kvstore";

/**
 * Implementation of KVStore using AWS DynamoDB.
 */
export class DynamoKVStore implements KVStoreClient {
  private tableName: string;
  private client: DynamoDBClient;

  constructor(name: string, opts?: KVStoreClientOptions) {
    this.tableName = name;
    this.client = new DynamoDBClient();
    opts;
  }

  public async get(key: string): Promise<string> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: {
          Key: { S: key },
        },
      })
    );
    if (result.Item == undefined) {
      throw new Error(`There is no target key-value pair, Key: ${key}.`);
    }
    return result.Item["Value"].S!;
  }

  public async set(key: string, val: string): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          Key: { S: key },
          Value: { S: val },
        },
      })
    );
  }
}
