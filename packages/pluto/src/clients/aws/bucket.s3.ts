import * as fs from "fs";
import assert from "assert";
import { promisify } from "util";
import { Readable, finished } from "stream";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { genResourceId } from "@plutolang/base/utils";
import { IBucketClient, Bucket, BucketOptions } from "../../bucket";
import { genAwsResourceName } from "./utils";

const promisifiedFinish = promisify(finished);

/**
 * Implementation of Bucket using S3.
 */
export class S3Bucket implements IBucketClient {
  private readonly id: string;
  private readonly bucketName: string;

  private client: S3Client;

  constructor(name: string, opts?: BucketOptions) {
    this.id = genResourceId(Bucket.fqn, name);
    this.bucketName = genAwsResourceName(this.id);

    this.client = new S3Client();
    opts;
  }

  public async put(fileKey: string, filePath: string): Promise<void> {
    const fileContent = fs.readFileSync(filePath);

    const uploadParams = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: fileContent,
    };

    await this.client.send(new PutObjectCommand(uploadParams));
  }

  public async get(fileKey: string, filePath: string): Promise<void> {
    const downloadParams = {
      Bucket: this.bucketName,
      Key: fileKey,
    };

    const data = await this.client.send(new GetObjectCommand(downloadParams));
    assert(data.Body, "data.Body is undefined");
    const fileStream = fs.createWriteStream(filePath);
    const stream = (data.Body as Readable).pipe(fileStream);
    await promisifiedFinish(stream);
  }
}
