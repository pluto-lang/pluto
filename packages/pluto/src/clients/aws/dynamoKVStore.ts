import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { KVStoreClient, KVStoreClientOptions } from "../../kvstore";

/**
 * Implementation of KVStore using AWS DynamoDB.
 */
export class DynamoKVStore implements KVStoreClient {
  private tableName: string;
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;

  constructor(name: string, opts?: KVStoreClientOptions) {
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
    console.log(key, val, this.tableName);
    try {
      const client = new DynamoDBClient();
      const docClient = DynamoDBDocumentClient.from(client);
      const command = new PutCommand({
        TableName: "kvstore",
        Item: {
          Id: key,
          Value: val,
        },
      });
      console.log("Start sending");
      const response = await docClient.send(command);
      console.log("Response: ", response);
    } catch (e) {
      console.log("Error: ", e);
    }
  }
}
