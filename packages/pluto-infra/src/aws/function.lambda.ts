import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Role } from "@pulumi/aws/iam";
import { Function } from "@pulumi/aws/lambda";
import { IResourceInfra } from "@plutolang/base";
import { ComputeClosure, Dependency, isComputeClosure } from "@plutolang/base/closure";
import { createEnvNameForProperty, genResourceId } from "@plutolang/base/utils";
import {
  AnyFunction,
  DEFAULT_FUNCTION_NAME,
  FunctionOptions,
  IFunctionInfra,
  Function as PlutoFunction,
} from "@plutolang/pluto";
import { genAwsResourceName } from "./utils";

export enum Ops {
  WATCH_LOG = "WATCH_LOG",
}

export class Lambda extends pulumi.ComponentResource implements IResourceInfra, IFunctionInfra {
  private readonly name: string;
  public readonly id: string;

  // eslint-disable-next-line
  private readonly lambda: Function;
  private readonly iam: Role;
  private readonly statements: aws.types.input.iam.GetPolicyDocumentStatement[];

  public get lambdaArn(): pulumi.Output<string> {
    return this.lambda.arn;
  }

  public get lambdaInvokeArn(): pulumi.Output<string> {
    return this.lambda.invokeArn;
  }

  constructor(closure: ComputeClosure<AnyFunction>, options?: FunctionOptions) {
    const name = options?.name ?? DEFAULT_FUNCTION_NAME;
    super("pluto:function:aws/Lambda", name, options);
    this.name = name;
    this.id = genResourceId(PlutoFunction.fqn, this.name);

    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

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

    this.iam = new aws.iam.Role(
      genAwsResourceName(this.id, "role"),
      {
        name: genAwsResourceName(this.id, "role"),
        assumeRolePolicy: role.then((assumeRole) => assumeRole.json),
      },
      { parent: this }
    );

    const envs: Record<string, any> = {
      ...options?.envs,
      PLUTO_PLATFORM_TYPE: "AWS",
    };

    closure.dependencies
      ?.filter((dep) => dep.type === "property")
      .forEach((dep) => {
        const envName = createEnvNameForProperty(dep.resourceObject.id, dep.operation);
        envs[envName] = (dep.resourceObject as any)[dep.operation]();
      });

    // TODO: Pulumi automatically packages all properties of a closure, which may lead to errors.
    // Therefore, we clear the dependencies property of the closure before building Lambda. However,
    // this action could affect external callers reusing the closure.
    extractAndClearDependency(closure);
    this.lambda = new aws.lambda.CallbackFunction(
      this.id,
      {
        name: this.id,
        callback: closure,
        role: this.iam,
        environment: {
          variables: envs,
        },
        runtime: "nodejs18.x",
        timeout: 30,
      },
      { parent: this }
    );

    this.statements = [this.grantPermission(Ops.WATCH_LOG, this)];
    const dependentStatements = closure.dependencies
      ?.filter((dep) => dep.type === "method")
      .map((dep) => dep.resourceObject.grantPermission(dep.operation, this));
    if (dependentStatements !== undefined) {
      this.statements.push(...dependentStatements);
    }
  }

  public grantPermission(
    op: string,
    _: IResourceInfra
  ): aws.types.input.iam.GetPolicyDocumentStatement {
    const WATCH_LOG_ARN = "arn:aws:logs:*:*:*";
    switch (op.toUpperCase()) {
      case Ops.WATCH_LOG:
        return {
          effect: "Allow",
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: [WATCH_LOG_ARN],
        };
      default:
        throw new Error(`Unknown op: ${op}`);
    }
  }

  public postProcess(): void {
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

interface NestedDependencies {
  dependencies?: Dependency[];
  innerClosureParts?: NestedDependencies;
}

function extractAndClearDependency(closure: ComputeClosure<AnyFunction>): NestedDependencies {
  const parts: NestedDependencies = {
    dependencies: closure.dependencies,
  };
  closure.dependencies = undefined;

  if (closure.innerClosure) {
    parts.innerClosureParts = extractAndClearDependency(closure.innerClosure);
  }
  return parts;
}
