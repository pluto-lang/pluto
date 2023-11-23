import fs from "fs";
import path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as archive from "@pulumi/archive";
import * as alicloud from "@pulumi/alicloud";
import { ResourceInfra } from "@plutolang/base";

export enum Ops {
  WATCH_LOG = "WATCH_LOG",
}

if (!process.env["WORK_DIR"]) {
  throw new Error("Missing environment variable WORK_DIR");
}
const WORK_DIR = process.env["WORK_DIR"]!;

export class FCFnResource extends pulumi.ComponentResource implements ResourceInfra {
  readonly name: string;

  public readonly fcInstance: alicloud.fc.Function;
  public readonly fcService: alicloud.fc.Service;

  constructor(name: string, args?: object, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:lambda:alicloud/FC", name, args, opts);
    this.name = name;

    const project = new alicloud.log.Project(`${name}-project`, {});
    const store = new alicloud.log.Store(`${name}-store`, { project: project.name });

    const role = new alicloud.ram.Role(`${name}-role`, {
      document: `  {
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": [
                  "fc.aliyuncs.com"
                ]
              }
            }
          ],
          "Version": "1"
      }
    `,
      description: `Pluto ${name} Role`,
    });
    new alicloud.ram.RolePolicyAttachment(`${name}-role-plicy-attachment`, {
      roleName: role.name,
      policyName: "AliyunLogFullAccess",
      policyType: "System",
    });

    this.fcService = new alicloud.fc.Service(`${name}-svc`, {
      description: `${name}-svc`,
      role: role.arn,
      logConfig: {
        project: project.name,
        logstore: store.name,
        enableInstanceMetrics: true,
        enableRequestMetrics: true,
      },
    });

    const entrypoint = `${this.name}.js`;
    this.fcInstance = new alicloud.fc.Function(`${name}-fc`, {
      service: this.fcService.name,
      description: `${name}-fc`,
      filename: this.buildZip(entrypoint),
      runtime: "nodejs16",
      handler: "runtime.default",
      environmentVariables: {
        COMPUTE_MODULE: entrypoint,
        RUNTIME_TYPE: "ALICLOUD",
      },
    });
  }

  public getPermission(op: string, resource?: ResourceInfra) {}

  public postProcess(): void {}

  private buildZip(moduleFilename: string): string {
    // copy the compute module and runtime to a directory
    const runtimeFilename = "runtime.js";
    const modulePath = path.join(WORK_DIR, moduleFilename);
    const runtimePath = path.join(__dirname, runtimeFilename);
    const sourceDir = path.join(WORK_DIR, `${this.name}-payload`);
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.copyFileSync(modulePath, path.join(sourceDir, moduleFilename));
    fs.copyFileSync(runtimePath, path.join(sourceDir, runtimeFilename));

    // build the zip file
    const outputPath = path.join(WORK_DIR, `${this.name}-payload.zip`);
    archive.getFile(
      {
        type: "zip",
        outputPath: outputPath,
        sourceDir: sourceDir,
      },
      { parent: this }
    );
    return outputPath;
  }
}
