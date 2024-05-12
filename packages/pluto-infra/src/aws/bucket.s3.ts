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

  public readonly bucket: aws.s3.BucketV2;

  constructor(name: string, opts?: BucketOptions) {
    super("pluto:bucket:aws/S3", name, opts);
    this.id = genResourceId(Bucket.fqn, name);

    const bucket = new aws.s3.BucketV2(
      genAwsResourceName(this.id),
      {
        bucket: genAwsResourceName(this.id),
        forceDestroy: true, // Destroy all objects before destroying the bucket
      },
      { parent: this }
    );

    this.bucket = bucket;
  }

  /**
   * Enable static website hosting for the bucket. Returns the website endpoint.
   */
  public configWebsite(indexDocument: string, errorDocument?: string) {
    const config = new aws.s3.BucketWebsiteConfigurationV2(
      genAwsResourceName(this.id),
      {
        bucket: this.bucket.bucket,
        indexDocument: {
          suffix: indexDocument,
        },
        errorDocument: errorDocument
          ? {
              key: errorDocument,
            }
          : undefined,
      },
      {
        parent: this,
      }
    );
    return config.websiteEndpoint.apply((endpoint) => `http://${endpoint}`);
  }

  public setPublic() {
    // AWS S3 disable public access by default.
    const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      genAwsResourceName(this.id),
      {
        bucket: this.bucket.bucket,
        blockPublicPolicy: false,
        blockPublicAcls: false,
        restrictPublicBuckets: false,
        ignorePublicAcls: false,
      },
      {
        parent: this,
      }
    );

    // Allow public access to the objects in the bucket.
    new aws.s3.BucketPolicy(
      genAwsResourceName(this.id),
      {
        bucket: this.bucket.bucket,
        policy: this.bucket.bucket.apply((bucketName) =>
          JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${bucketName}/*`],
              },
            ],
          })
        ),
      },
      {
        parent: this,
        dependsOn: [bucketPublicAccessBlock],
      }
    );
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
