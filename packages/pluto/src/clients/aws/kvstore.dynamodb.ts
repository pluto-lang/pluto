import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { IKVStoreClient, KVStore, KVStoreOptions } from "../../kvstore";
import { genResourceId } from "@plutolang/base/utils";
import { genAwsResourceName } from "./utils";

/**
 * Implementation of KVStore using AWS DynamoDB.
 */
export class DynamoKVStore implements IKVStoreClient {
  private readonly id: string;
  private readonly tableName: string;

  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;

  constructor(name: string, opts?: KVStoreOptions) {
    this.id = genResourceId(KVStore.fqn, name);
    this.tableName = genAwsResourceName(this.id);

    this.client = new DynamoDBClient();
    this.docClient = DynamoDBDocumentClient.from(this.client);
    opts;
  }

  public get awsTableName(): string {
    return this.tableName;
  }

  public get awsPartitionKey(): string {
    return "Id";
  }

  public async get(key: string): Promise<string> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          [this.awsPartitionKey]: key,
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
