import { glob } from "glob";
import * as path from "path";
import * as fs from "fs-extra";
import * as aws from "@pulumi/aws";
import * as mime from "mime-types";
import * as pulumi from "@pulumi/pulumi";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { Website as WebsiteProto, WebsiteOptions } from "@plutolang/pluto";
import { S3Bucket } from "./bucket.s3";

export class Website extends pulumi.ComponentResource implements IResourceInfra {
  public readonly id: string;

  private readonly envs: { [key: string]: pulumi.Output<string> | string } = {};
  private readonly websiteDir: string;

  private readonly websiteBucket: S3Bucket;

  private readonly websiteEndpoint: pulumi.Output<string>;

  // eslint-disable-next-line
  public outputs?: pulumi.Output<any>;

  constructor(websiteRoot: string, name?: string, options?: WebsiteOptions) {
    name = name ?? "default";
    super("pluto:website:aws/Website", name, options);
    this.id = genResourceId(WebsiteProto.fqn, name);

    const projectRoot = new pulumi.Config("pluto").require("projectRoot");
    this.websiteDir = path.resolve(projectRoot, websiteRoot);
    if (!fs.existsSync(this.websiteDir)) {
      throw new Error(`The path ${this.websiteDir} does not exist.`);
    }

    this.websiteBucket = new S3Bucket(this.id);
    this.websiteBucket.setPublic();
    this.websiteEndpoint = this.websiteBucket.configWebsite("index.html");

    this.outputs = this.websiteEndpoint;
  }

  public addEnv(key: string, value: pulumi.Output<string> | string) {
    this.envs[key] = value;
  }

  public url(): string {
    return this.websiteEndpoint as any;
  }

  public grantPermission(op: string, resource?: IResourceInfra) {
    op;
    resource;
    throw new Error("Method should be called.");
  }

  public postProcess(): void {
    function dumpPlutoJs(filepath: string, envs: { [key: string]: string }) {
      const content = PLUTO_JS_TEMPALETE.replace("{placeholder}", JSON.stringify(envs, null, 2));
      fs.writeFileSync(filepath, content);
    }

    function uploadFileToS3(bucket: S3Bucket, dirpath: string) {
      return glob.sync(`${dirpath}/**/*`, { nodir: true }).map((file) => {
        const lambdaAssetName = file.replace(new RegExp(`${dirpath}/?`, "g"), "");
        const mimeType = mime.lookup(file) || undefined;
        return new aws.s3.BucketObjectv2(lambdaAssetName, {
          bucket: bucket.bucket.bucket,
          key: lambdaAssetName,
          contentType: mimeType,
          source: new pulumi.asset.FileAsset(file),
        });
      });
    }

    pulumi.output(this.envs).apply((envs) => {
      const filepath = path.join(this.websiteDir, "pluto.js");
      // Developers may have previously constructed a `pluto.js` file to facilitate debugging
      // throughout the development process. Therefore, it's essential to back up the original
      // content of `pluto.js` and ensure it's restored after deployment.
      const originalPlutoJs = fs.existsSync(filepath)
        ? fs.readFileSync(filepath, "utf8")
        : undefined;

      let objects: aws.s3.BucketObjectv2[] = [];
      try {
        dumpPlutoJs(filepath, envs);
        objects = uploadFileToS3(this.websiteBucket, this.websiteDir);
      } finally {
        // Clean up the generated `pluto.js` file after uploading all files to S3.
        pulumi.all(objects.map((o) => o.id)).apply(async () => {
          // Remove the generated `pluto.js` file after deployment.
          fs.removeSync(filepath);
          // Restore original pluto.js content.
          if (originalPlutoJs) {
            fs.writeFileSync(filepath, originalPlutoJs);
          }
        });
      }
    });
  }
}

const PLUTO_JS_TEMPALETE = `
window.plutoEnv = {placeholder}
`;
