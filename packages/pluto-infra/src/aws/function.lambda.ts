import * as os from "os";
import * as fs from "fs-extra";
import * as path from "path";
import { Context } from "aws-lambda";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Role } from "@pulumi/aws/iam";
import { Function } from "@pulumi/aws/lambda";
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
  FunctionOptions,
  IFunctionInfra,
  Function as PlutoFunction,
} from "@plutolang/pluto";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";
import { serializeClosureToDir } from "../utils";
import { currentAwsRegion } from "./utils";

export enum Ops {
  WATCH_LOG = "WATCH_LOG",
  INVOKE = "INVOKE",
}

export class Lambda extends pulumi.ComponentResource implements IResourceInfra, IFunctionInfra {
  public readonly id: string;

  private readonly lambda: Function;
  private readonly iam: Role;
  private readonly statements: aws.types.input.iam.GetPolicyDocumentStatement[];

  public readonly lambdaName: string;
  public readonly lambdaArn: pulumi.Output<string>;
  public readonly lambdaInvokeArn: pulumi.Output<string>;

  constructor(closure: ComputeClosure<AnyFunction>, options?: FunctionOptions) {
    const name = options?.name ?? DEFAULT_FUNCTION_NAME;
    super("pluto:function:aws/Lambda", name, options);
    this.id = genResourceId(PlutoFunction.fqn, name);

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
      closure = wrapClosure(adaptAwsRuntime(closure), closure);
    }

    // Extract the environment variables from the closure.
    const envs: Record<string, any> = {
      ...options?.envs,
      PLUTO_PROJECT_NAME: currentProjectName(),
      PLUTO_STACK_NAME: currentStackName(),
      PLUTO_PLATFORM_TYPE: PlatformType.AWS,
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

    // Create the IAM role and lambda function.
    this.iam = this.createIAM();
    this.lambdaName = genAwsResourceName(this.id);
    this.lambda = this.createLambda(workdir, entrypointFilePathP, exportName, envs);
    this.lambdaArn = this.lambda.arn;
    this.lambdaInvokeArn = this.lambda.invokeArn;

    // Generate the IAM statements for this lambda's IAM.
    this.statements = [this.grantPermission(Ops.WATCH_LOG)];
    // TODO: Note: the dependencies of cloures will be deleted during serialization temporarily. So
    // we need to wait the serialization process to finish.
    entrypointFilePathP.then(() => {
      const dependentStatements = closure.dependencies
        ?.filter((dep) => dep.type === "method")
        .map((dep) => dep.resourceObject.grantPermission(dep.operation, this));
      if (dependentStatements !== undefined) {
        this.statements.push(...dependentStatements);
      }
      this.grantIAMPermission();
    });
  }

  public grantPermission(op: string): aws.types.input.iam.GetPolicyDocumentStatement {
    const WATCH_LOG_ARN = "arn:aws:logs:*:*:*";
    switch (op.toUpperCase()) {
      case Ops.WATCH_LOG:
        return {
          effect: "Allow",
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: [WATCH_LOG_ARN],
        };
      case Ops.INVOKE:
        const fuzzyArn = `arn:aws:lambda:${currentAwsRegion()}:*:function:${this.lambdaName}`;
        return {
          effect: "Allow",
          actions: ["lambda:InvokeFunction"],
          resources: [fuzzyArn],
        };
      default:
        throw new Error(`Unknown op: ${op}`);
    }
  }

  // Function resources will not be further processed. Moreover, since functions are constructed by
  // SDK developers rather than users, `postProcess` of these functions won't be executed within
  // generated IaC code - hence leaving postProcess empty.
  public postProcess(): void {}

  private createLambda(
    workdir: string,
    entrypointFilePathP: Promise<string>,
    exportName: string,
    envs: Record<string, any>
  ) {
    const handlerName = entrypointFilePathP.then((filepath) => {
      const filename = path.basename(filepath);
      const prefix = filename.substring(0, filename.lastIndexOf("."));
      return `${prefix}.${exportName}`;
    });

    return new aws.lambda.Function(
      this.lambdaName,
      {
        name: this.lambdaName,
        code: entrypointFilePathP.then(() => new pulumi.asset.FileArchive(workdir)),
        role: this.iam.arn,
        handler: handlerName,
        runtime: "nodejs18.x",
        environment: {
          variables: envs,
        },
        timeout: 30,
      },
      { parent: this }
    );
  }

  private createIAM() {
    const role = aws.iam.getPolicyDocument(
      {
        statements: [
          {
            effect: "Allow",
            principals: [
              {
                type: "Service",
                identifiers: ["lambda.amazonaws.com"],
              },
            ],
            actions: ["sts:AssumeRole"],
          },
        ],
      },
      { parent: this }
    );

    return new aws.iam.Role(
      genAwsResourceName(this.id, "role"),
      {
        name: genAwsResourceName(this.id, "role"),
        assumeRolePolicy: role.then((assumeRole) => assumeRole.json),
      },
      { parent: this }
    );
  }

  private grantIAMPermission(): void {
    const policyDocument = aws.iam.getPolicyDocument(
      {
        statements: this.statements,
      },
      { parent: this }
    );

    const policy = new aws.iam.Policy(
      genAwsResourceName(this.id, "policy"),
      {
        name: genAwsResourceName(this.id, "policy"),
        path: "/",
        description: "IAM policy",
        policy: policyDocument.then((policyDocument) => policyDocument.json),
      },
      { parent: this }
    );

    new aws.iam.RolePolicyAttachment(
      genAwsResourceName(this.id, "iam-attachment"),
      {
        role: this.iam.name,
        policyArn: policy.arn,
      },
      { parent: this }
    );
  }
}

type DirectCallHandler = (payload: any[], context: Context) => Promise<DirectCallResponse>;

function adaptAwsRuntime(__handler_: AnyFunction): DirectCallHandler {
  return async function (payload, context): Promise<DirectCallResponse> {
    const accountId = context.invokedFunctionArn.split(":")[4];
    process.env["AWS_ACCOUNT_ID"] = accountId;

    try {
      console.log("Payload:", payload);
      if (!Array.isArray(payload)) {
        return {
          code: 400,
          body: `Payload should be an array.`,
        };
      }

      let response: DirectCallResponse;
      try {
        const result = await __handler_(...payload);
        response = {
          code: 200,
          body: result,
        };
      } catch (e) {
        // The error comes from inside the user function.
        console.log("Function execution failed:", e);
        response = {
          code: 400,
          body: `Function execution failed: ` + (e instanceof Error ? e.message : e),
        };
      }
      return response;
    } catch (e) {
      // The error is caused by the HTTP processing, not the user function.
      return {
        code: 500,
        body: `Something wrong. Please contact the administrator.`,
      };
    }
  };
}
