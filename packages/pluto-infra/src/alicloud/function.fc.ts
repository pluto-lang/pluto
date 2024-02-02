import os from "os";
import fs from "fs-extra";
import path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import * as archive from "@pulumi/archive";
import { IResourceInfra, PlatformType } from "@plutolang/base";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import {
  createEnvNameForProperty,
  currentProjectName,
  currentStackName,
  genResourceId,
} from "@plutolang/base/utils";
import {
  AnyFunction,
  DEFAULT_FUNCTION_NAME,
  DirectCallResponse,
  Function,
  FunctionOptions,
  IFunctionInfra,
} from "@plutolang/pluto";
import { genAliResourceName } from "@plutolang/pluto/dist/clients/alicloud";
import { serializeClosureToDir } from "../utils";

export enum Ops {
  WATCH_LOG = "WATCH_LOG",
}

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

export class FCInstance extends pulumi.ComponentResource implements IResourceInfra, IFunctionInfra {
  public readonly id: string;

  public readonly fcInstance: alicloud.fc.Function;
  public readonly fcService: alicloud.fc.Service;
  public readonly fcRole: alicloud.ram.Role;

  private readonly policies: RamPolicy[];

  constructor(closure: ComputeClosure<AnyFunction>, options?: FunctionOptions) {
    const name = options?.name ?? DEFAULT_FUNCTION_NAME;
    super("pluto:function:alicloud/FC", name, options);
    this.id = genResourceId(Function.fqn, name);

    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    // Check if the closure is created by user directly or not. If yes, we need to wrap it with the
    // platform adaption function.
    //
    // TODO: The closure that meets the below condition might not necessarily be one created by the
    // user themselves. It could also potentially be created by a SDK developer. We need to find a
    // more better method to verify this.
    if (closure.dirpath !== "inline" && closure.innerClosure === undefined) {
      closure = wrapClosure(adaptAliCloudRuntime(closure), closure);
    }

    // Extract the environment variables from the closure.
    const envs: Record<string, any> = {
      ...options?.envs,
      PLUTO_PROJECT_NAME: currentProjectName(),
      PLUTO_STACK_NAME: currentStackName(),
      PLUTO_PLATFORM_TYPE: PlatformType.AliCloud,
    };
    closure.dependencies
      ?.filter((dep) => dep.type === "property")
      .forEach((dep) => {
        const envName = createEnvNameForProperty(dep.resourceObject.id, dep.operation);
        envs[envName] = (dep.resourceObject as any)[dep.operation]();
      });

    // Serialize the closure with its dependencies to a directory.
    const workdir = path.join(os.tmpdir(), `pluto`, `${this.id}_${Date.now()}`);
    fs.ensureDirSync(workdir);
    const exportName = "handler";
    const entrypointFilePathP = serializeClosureToDir(workdir, closure, { exportName: exportName });

    // Follow the steps to create some AliCloud resources.
    const projName = genAliResourceName(this.id, "project");
    const project = new alicloud.log.Project(projName, { projectName: projName }, { parent: this });
    const storeName = genAliResourceName(this.id, "store");
    const store = new alicloud.log.Store(
      storeName,
      { name: storeName, project: project.projectName },
      { parent: this }
    );

    this.fcRole = this.createRole();
    this.fcService = this.createService(project, store);
    this.fcInstance = this.createFunction(workdir, entrypointFilePathP, exportName, envs);

    this.policies = [this.grantPermission(Ops.WATCH_LOG)];
    // TODO: Note: the dependencies of cloures will be deleted during serialization temporarily. So
    // we need to wait the serialization process to finish.
    entrypointFilePathP.then(() => {
      const dependentPolicies = closure.dependencies
        ?.filter((dep) => dep.type === "method")
        .map((dep) => dep.resourceObject.grantPermission(dep.operation, this));
      if (dependentPolicies !== undefined) {
        this.policies.push(...dependentPolicies);
      }
      this.grantRolePermission();
    });
  }

  public grantPermission(op: string): RamPolicy {
    switch (op.toUpperCase()) {
      case Ops.WATCH_LOG:
        return {
          policyName: "AliyunLogFullAccess",
          policyType: "System",
        };
      default:
        throw new Error(`Unknown op: ${op}`);
    }
  }

  public postProcess(): void {}

  private createRole() {
    const roleName = genAliResourceName(this.id, "role");
    return new alicloud.ram.Role(
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
        description: `Pluto ${this.id} FC Role`,
      },
      { parent: this }
    );
  }

  private createService(project: alicloud.log.Project, store: alicloud.log.Store) {
    const svcName = genAliResourceName(this.id, "svc");
    return new alicloud.fc.Service(
      svcName,
      {
        name: svcName,
        description: `${this.id}_svc_pluto`,
        role: this.fcRole.arn,
        logConfig: {
          project: project.projectName,
          logstore: store.name,
          enableInstanceMetrics: true,
          enableRequestMetrics: true,
        },
      },
      { parent: this }
    );
  }

  private createFunction(
    workdir: string,
    entrypointFilePathP: Promise<string>,
    exportName: string,
    envs: Record<string, any>
  ) {
    // Pack up the directory into a zip file archive.
    const outputPath = path.join(workdir, `${this.id}_payload.zip`);
    const zipPkgP = entrypointFilePathP.then(() => {
      return archive.getFile(
        {
          type: "zip",
          outputPath: outputPath,
          sourceDir: workdir,
          excludes: [path.basename(outputPath)],
        },
        { parent: this }
      );
    });

    const handlerName = entrypointFilePathP.then((filepath) => {
      const filename = path.basename(filepath);
      const prefix = filename.substring(0, filename.lastIndexOf("."));
      return `${prefix}.${exportName}`;
    });

    const instanceName = genAliResourceName(this.id, "fc");
    return new alicloud.fc.Function(
      instanceName,
      {
        name: instanceName,
        service: this.fcService.name,
        description: `${this.id}_fc_pluto`,
        filename: zipPkgP.then((zipPkg) => zipPkg.outputPath),
        runtime: "nodejs16",
        handler: handlerName,
        environmentVariables: envs,
      },
      { parent: this }
    );
  }

  private grantRolePermission(): void {
    this.policies.forEach((policy) => {
      if (!policy.policy && (!policy.policyName || !policy.policyType)) {
        throw new Error("The policy and (name, type) cannot both be undefined.");
      }

      const rolePolicyAttachmentName = genAliResourceName(this.id, "role_policy_attachment");
      new alicloud.ram.RolePolicyAttachment(
        rolePolicyAttachmentName,
        {
          roleName: this.fcRole.name,
          policyName: policy.policy?.policyName ?? policy.policyName!,
          policyType: policy.policy?.type ?? policy.policyType!,
        },
        { parent: this }
      );
    });
  }
}

type CallbackFn = (error: Error | null, data?: object) => Promise<void>;

function adaptAliCloudRuntime(__handler_: AnyFunction) {
  return async (inData: Buffer, context: any, callback: CallbackFn) => {
    const accountId = context.accountId;
    process.env["ALICLOUD_ACCOUNT_ID"] = accountId;

    try {
      const payload = JSON.parse(inData.toString());
      console.log("Payload:", payload);
      if (!Array.isArray(payload)) {
        callback(new Error("The payload is not an array."));
        return;
      }

      let response: DirectCallResponse;
      try {
        const respData = await __handler_(...payload);
        response = {
          code: 200,
          body: respData,
        };
      } catch (e) {
        // The error comes from inside the user function.
        console.log("Function execution failed:", e);
        response = {
          code: 400,
          body: `Function execution failed: ` + (e instanceof Error ? e.message : e),
        };
      }
      callback(null, response);
    } catch (e) {
      console.log("Failed to handle http request: ", e);
      callback(new Error("Internal Server Error"));
    }
  };
}
