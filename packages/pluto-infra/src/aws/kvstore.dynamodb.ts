import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { IKVStoreInfra, KVStore, KVStoreOptions } from "@plutolang/pluto";
import { Permission } from "./permission";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";

export enum DynamoDbOps {
  GET = "get",
  SET = "set",
}

export class DynamoKVStore
  extends pulumi.ComponentResource
  implements IResourceInfra, IKVStoreInfra
{
  public readonly id: string;

  public readonly arn: pulumi.Output<string>;

  constructor(name: string, opts?: KVStoreOptions) {
    super("pluto:kvstore:aws/DynamoDB", name, opts);
    this.id = genResourceId(KVStore.fqn, name);

    const db = new aws.dynamodb.Table(
      genAwsResourceName(this.id),
      {
        name: genAwsResourceName(this.id),
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

  public grantPermission(op: string): Permission {
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
    return `arn:aws:dynamodb:*:*:table/${genAwsResourceName(this.id)}`;
  }
}
