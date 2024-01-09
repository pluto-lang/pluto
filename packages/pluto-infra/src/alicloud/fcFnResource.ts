import fs from "fs";
import path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as archive from "@pulumi/archive";
import * as alicloud from "@pulumi/alicloud";
import { ResourceInfra } from "@plutolang/base";
import { FunctionOptions } from "@plutolang/pluto";
import { formatName } from "./utils";

export enum Ops {
  WATCH_LOG = "WATCH_LOG",
}

if (!process.env["WORK_DIR"]) {
  throw new Error("Missing environment variable WORK_DIR");
}
const WORK_DIR = process.env["WORK_DIR"]!;

/**
 * AliCloud RAM Policy
 *   If it is a custom policy, it should be an alicloud.ram.Policy object.
 *   If it is a built-in policy, it should be the name and type of the built-in policy.
 */
interface RamPolicy {
  policy?: alicloud.ram.Policy;

  policyName?: string;
  policyType?: string;
}

export class FCFnResource extends pulumi.ComponentResource implements ResourceInfra {
  readonly name: string;

  public readonly fcInstance: alicloud.fc.Function;
  public readonly fcService: alicloud.fc.Service;
  public readonly fcRole: alicloud.ram.Role;

  private readonly policies: RamPolicy[];

  constructor(name: string, args?: FunctionOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:lambda:alicloud/FC", name, args, opts);
    this.name = name;
    this.policies = [];

    const projName = formatName(`${name}_project`);
    const project = new alicloud.log.Project(projName, { name: projName }, { parent: this });
    const storeName = formatName(`${name}_store`);
    const store = new alicloud.log.Store(
      storeName,
      { name: storeName, project: project.name },
      { parent: this }
    );

    const roleName = formatName(`${name}_role`);
    this.fcRole = new alicloud.ram.Role(
      roleName,
      {
        name: roleName,
        document: `{
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
        }`,
        description: `Pluto ${name} FC Role`,
      },
      { parent: this }
    );
    this.getPermission("WATCH_LOG", this);

    const svcName = formatName(`${name}_svc`);
    this.fcService = new alicloud.fc.Service(
      svcName,
      {
        name: svcName,
        description: `${name}_svc_pluto`,
        role: this.fcRole.arn,
        logConfig: {
          project: project.name,
          logstore: store.name,
          enableInstanceMetrics: true,
          enableRequestMetrics: true,
        },
      },
      { parent: this }
    );
    const entrypoint = `${this.name}.js`;

    const envs: Record<string, any> = {
      ...args?.envs,
      COMPUTE_MODULE: entrypoint,
      RUNTIME_TYPE: "ALICLOUD",
    };

    const insName = formatName(`${name}_fc`);
    this.fcInstance = new alicloud.fc.Function(
      insName,
      {
        name: insName,
        service: this.fcService.name,
        description: `${name}_fc_pluto`,
        filename: this.buildZip(entrypoint),
        runtime: "nodejs16",
        handler: "runtime.default",
        environmentVariables: envs,
      },
      { parent: this }
    );
  }

  public getPermission(op: string, resource: ResourceInfra) {
    if (resource !== this) {
      const policy: alicloud.ram.Policy = resource.getPermission(op);
      this.policies.push({ policy: policy });
    } else {
      switch (op.toUpperCase()) {
        case Ops.WATCH_LOG:
          this.policies.push({
            policyName: "AliyunLogFullAccess",
            policyType: "System",
          });
          break;
        default:
          throw new Error(`Unknown op: ${op}`);
      }
    }
  }

  public postProcess(): void {
    this.policies.forEach((policy) => {
      if (!policy.policy && (!policy.policyName || !policy.policyType)) {
        throw new Error("The policy and (name, type) cannot both be undefined.");
      }

      new alicloud.ram.RolePolicyAttachment(
        `${this.name}_role_plicy_attachment`,
        {
          roleName: this.fcRole.name,
          policyName: policy.policy?.policyName ?? policy.policyName!,
          policyType: policy.policy?.type ?? policy.policyType!,
        },
        { parent: this }
      );
    });
  }

  private buildZip(moduleFilename: string): string {
    // copy the compute module and runtime to a directory
    const runtimeFilename = "runtime.js";
    const modulePath = path.join(WORK_DIR, moduleFilename);
    const runtimePath = path.join(__dirname, runtimeFilename);
    const sourceDir = path.join(WORK_DIR, `${this.name}_payload`);
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.copyFileSync(modulePath, path.join(sourceDir, moduleFilename));
    fs.copyFileSync(runtimePath, path.join(sourceDir, runtimeFilename));

    // build the zip file
    const outputPath = path.join(WORK_DIR, `${this.name}_payload.zip`);
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
