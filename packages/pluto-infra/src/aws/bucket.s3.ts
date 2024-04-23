import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { IResourceInfra } from "@plutolang/base";
import { Bucket, BucketOptions } from "@plutolang/pluto";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";
import { genResourceId } from "@plutolang/base/utils";
import { Permission } from "./permission";

export enum S3Ops {
  GET = "get",
  PUT = "put",
}

export class S3Bucket extends pulumi.ComponentResource implements IResourceInfra {
  public readonly id: string;

  public readonly bucket: aws.s3.Bucket;

  constructor(name: string, opts?: BucketOptions) {
    super("pluto:bucket:aws/S3", name, opts);
    this.id = genResourceId(Bucket.fqn, name);

    const bucket = new aws.s3.Bucket(
      genAwsResourceName(this.id),
      {
        bucket: genAwsResourceName(this.id),
      },
      { parent: this }
    );

    this.bucket = bucket;
  }

  public grantPermission(op: string): Permission {
    const actions: string[] = [];
    switch (op) {
      case S3Ops.GET:
        actions.push("s3:GetObject");
        break;
      case S3Ops.PUT:
        actions.push("s3:PutObject");
        break;
      default:
        throw new Error(`Unknown operation: ${op}`);
    }

    return {
      effect: "Allow",
      actions: actions,
      resources: [this.bucket.arn, this.bucket.arn.apply((arn) => `${arn}/*`)],
    };
  }

  public postProcess(): void {}
}
