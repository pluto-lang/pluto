import * as path from "path";
import * as fs from "fs-extra";
import assert from "node:assert";
import { Context } from "aws-lambda";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Role } from "@pulumi/aws/iam";
import { Function as AwsLambda } from "@pulumi/aws/lambda";
import { IResourceInfra, LanguageType, PlatformType } from "@plutolang/base";
import { ComputeClosure, getDepth, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import {
  createEnvNameForProperty,
  currentLanguage,
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
import { dumpClosureToDir_python, serializeClosureToDir, getDefaultPythonRuntime } from "../utils";
import { Permission } from "./permission";
import { S3Bucket } from "./bucket.s3";

export enum Ops {
  WATCH_LOG = "WATCH_LOG",
  INVOKE = "INVOKE",
}

export class Lambda extends pulumi.ComponentResource implements IResourceInfra, IFunctionInfra {
  public readonly id: string;
  private readonly options: FunctionOptions;

  private readonly lambda: AwsLambda;
  private readonly lambdaUrl: aws.lambda.FunctionUrl;
  private readonly iam: Role;
  private readonly statements: aws.types.input.iam.GetPolicyDocumentStatementArgs[];

  public readonly lambdaName: string;
  public readonly lambdaArn: pulumi.Output<string>;
  public readonly lambdaInvokeArn: pulumi.Output<string>;

  public readonly outputs?: pulumi.Output<any> | string;

  private static lambdaAssetsBucket?: S3Bucket;

  constructor(closure: ComputeClosure<AnyFunction>, name?: string, options: FunctionOptions = {}) {
    name = name ?? DEFAULT_FUNCTION_NAME;
    super("pluto:function:aws/Lambda", name, options);
    this.id = genResourceId(PlutoFunction.fqn, name);
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }
    this.options = options;

    // Check if the closure is created by user directly or not. If yes, we need to wrap it with the
    // platform adaption function.
    if (getDepth(closure) === 1) {
      closure = adaptPlatformNorm(closure);
    }

    if (currentLanguage() === LanguageType.Python) {
      // There's a common top adapter for Python functions. It's used to add a child directory to
      // the system path, helping the Python interpreter locate dependencies accurately.
      closure = wrapClosure(() => {}, closure, {
        dirpath: path.join(__dirname, "common_top_adapter.py"),
        exportName: "handler",
        placeholder: "__handler_",
      });
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
    assert(process.env.WORK_DIR, "WORK_DIR is not set.");
    const workdir = path.join(process.env.WORK_DIR, "assets", `${this.id}`);
    fs.rmSync(workdir, { recursive: true, force: true });
    fs.ensureDirSync(workdir);
    let entrypointFilePathP: Promise<string>;
    let runtime: string;
    if (currentLanguage() === LanguageType.TypeScript) {
      entrypointFilePathP = serializeClosureToDir(workdir, closure, {
        exportName: closure.exportName,
      });
      runtime = "nodejs18.x";
    } else if (currentLanguage() === LanguageType.Python) {
      entrypointFilePathP = dumpClosureToDir_python(workdir, closure);
      runtime = getDefaultPythonRuntime();
    } else {
      throw new Error(`Unsupported language: ${currentLanguage()}`);
    }

    // Create the IAM role and lambda function.
    this.iam = this.createIAM();
    this.lambdaName = genAwsResourceName(this.id);
    this.lambda = this.createLambda(
      workdir,
      entrypointFilePathP,
      runtime,
      closure.exportName,
      envs
    );
    this.lambdaUrl = this.createLambdaUrl();
    this.lambdaArn = this.lambda.arn;
    this.lambdaInvokeArn = this.lambda.invokeArn;

    // Generate the IAM statements for this lambda's IAM.
    this.statements = [this.grantPermission(Ops.WATCH_LOG)];
    // TODO: Note: the dependencies of cloures will be deleted during serialization temporarily. So
    // we need to wait the serialization process to finish.
    entrypointFilePathP.then(() => {
      const dependentStatements = closure.dependencies
        ?.filter((dep) => dep.type === "method")
        .map((dep) => dep.resourceObject.grantPermission(dep.operation, this) as Permission);
      if (dependentStatements !== undefined) {
        this.statements.push(...dependentStatements);
      }
      this.grantIAMPermission();
    });

    this.outputs = this.url();
  }

  public url(): string {
    return this.lambdaUrl.functionUrl as any;
  }

  public grantPermission(op: string): Permission {
    const WATCH_LOG_ARN = "arn:aws:logs:*:*:*";
    switch (op.toUpperCase()) {
      case Ops.WATCH_LOG:
        return {
          effect: "Allow",
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: [WATCH_LOG_ARN],
        };
      case Ops.INVOKE: {
        return {
          effect: "Allow",
          actions: ["lambda:InvokeFunction"],
          resources: [this.lambda.arn],
        };
      }
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
    runtime: string,
    exportName: string,
    envs: Record<string, any>
  ) {
    const handlerName = entrypointFilePathP.then((filepath) => {
      const filename = path.basename(filepath);
      const prefix = filename.substring(0, filename.lastIndexOf("."));
      return `${prefix}.${exportName}`;
    });

    if (Lambda.lambdaAssetsBucket === undefined) {
      Lambda.lambdaAssetsBucket = new S3Bucket("lambda-assets");
    }

    const lambdaAssetName = genAwsResourceName(this.id, Date.now().toString());
    function upload(): pulumi.Output<string> {
      const lambdaZip = new pulumi.asset.FileArchive(workdir);
      const object = new aws.s3.BucketObject(lambdaAssetName, {
        bucket: Lambda.lambdaAssetsBucket!.bucket,
        source: lambdaZip,
      });
      return object.key;
    }

    return new aws.lambda.Function(
      this.lambdaName,
      {
        name: this.lambdaName,
        // code: pulumi.output(entrypointFilePathP).apply(() => new pulumi.asset.FileArchive(workdir)),
        s3Bucket: Lambda.lambdaAssetsBucket!.bucket.bucket,
        s3Key: pulumi.output(entrypointFilePathP).apply(upload),
        role: this.iam.arn,
        handler: handlerName,
        runtime: runtime,
        memorySize: this.options.memory ?? 128,
        environment: {
          variables: envs,
        },
        timeout: 10 * 60,
      },
      { parent: this }
    );
  }

  private createLambdaUrl() {
    return new aws.lambda.FunctionUrl(
      genAwsResourceName(this.id, "url"),
      {
        functionName: this.lambda.name,
        authorizationType: "NONE",
        cors: {
          allowOrigins: ["*"],
        },
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
    const policyDocument = aws.iam.getPolicyDocumentOutput(
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
        policy: policyDocument.json,
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

type DirectCallHandler = (payload: any, context: Context) => Promise<DirectCallResponse>;

function adaptAwsRuntime(__handler_: AnyFunction): DirectCallHandler {
  function isHttpPayload(payload: any): boolean {
    return (
      payload !== null &&
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "headers") &&
      Object.prototype.hasOwnProperty.call(payload, "queryStringParameters") &&
      Object.prototype.hasOwnProperty.call(payload, "rawPath")
    );
  }

  return async function (payload, context): Promise<DirectCallResponse> {
    const accountId = context.invokedFunctionArn.split(":")[4];
    process.env["AWS_ACCOUNT_ID"] = accountId;

    try {
      console.log("Payload:", payload);

      // When users make a direct call to the function using an HTTP request, the payload differs
      // from that of an SDK invocation. Therefore, we interpret the body of the request as
      // arguments for the function.
      if (isHttpPayload(payload)) {
        payload = JSON.parse(payload.body);
      }

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

function adaptPlatformNorm(closure: ComputeClosure<AnyFunction>): ComputeClosure<AnyFunction> {
  switch (currentLanguage()) {
    case LanguageType.TypeScript:
      return wrapClosure(adaptAwsRuntime(closure), closure, {
        dirpath: "inline",
        exportName: "handler",
        placeholder: "__handler_",
      });
    case LanguageType.Python:
      return wrapClosure(() => {}, closure, {
        dirpath: path.join(__dirname, "lambda_adapter.py"),
        exportName: "handler",
        placeholder: "__handler_",
      });
    default:
      throw new Error(`Unsupported language: ${currentLanguage()}`);
  }
}
