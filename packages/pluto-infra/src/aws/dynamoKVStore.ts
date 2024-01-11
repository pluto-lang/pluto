import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ResourceInfra } from "@plutolang/base";
import { IKVStoreInfraApi, KVStoreInfraOptions } from "@plutolang/pluto";
import { Permission } from "./permission";

export enum DynamoDbOps {
  GET = "get",
  SET = "set",
}

export class DynamoKVStore
  extends pulumi.ComponentResource
  implements ResourceInfra, IKVStoreInfraApi
{
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

  public getPermission(op: string): Permission {
    const actions: string[] = [];
    switch (op) {
      case DynamoDbOps.GET:
        actions.push("dynamodb:*");
        break;
      case DynamoDbOps.SET:
        actions.push("dynamodb:*");
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

  public postProcess(): void {}

  private fuzzyArn() {
    return `arn:aws:dynamodb:*:*:table/${this.name}`;
  }
}
