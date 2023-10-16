import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ResourceInfra } from "@pluto/base";
import { KVStoreInfraOptions } from "@pluto/pluto";

export enum DynamoDbOps {
  GET = "GET",
  SET = "SET",
  PUSH = "PUSH",
}

export class DynamoKVStore extends pulumi.ComponentResource implements ResourceInfra {
  readonly name: string;
  arn: pulumi.Output<string>;

  constructor(name: string, opts?: KVStoreInfraOptions) {
    super("pluto:kvstore:aws/DynamoDB", name, opts);
    this.name = name;

    const db = new aws.dynamodb.Table(
      name,
      {
        name: name,
        attributes: [
          {
            name: "Id",
            type: "S",
          },
        ],
        hashKey: "Id",
        readCapacity: 10,
        writeCapacity: 10,
      },
      { parent: this }
    );

    this.arn = db.arn;
  }

  fuzzyArn() {
    return `arn:aws:dynamodb:*:*:table/${this.name}`;
  }

  public postProcess(): void {}
}
