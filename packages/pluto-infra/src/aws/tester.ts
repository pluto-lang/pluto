import * as pulumi from "@pulumi/pulumi";
import { Handler } from "aws-lambda";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import { TestCase, ITesterInfra, TesterOptions, Tester, TestHandler } from "@plutolang/pluto";
import { Lambda } from "./function.lambda";

export class AwsTester extends pulumi.ComponentResource implements IResourceInfra, ITesterInfra {
  public readonly id: string;

  private readonly description: string;
  private readonly testCases: TestCase[];

  // eslint-disable-next-line
  public outputs?: pulumi.Output<any>;

  constructor(description: string, props?: TesterOptions) {
    const name = description.replaceAll(/\s+/g, "");
    super("pluto:tester:aws/Tester", name, props);
    this.id = genResourceId(Tester.fqn, name);

    this.description = description;
    this.testCases = [];
  }

  public it(description: string, closure: ComputeClosure<TestHandler>): void {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    const runtimeHandler = wrapClosure(adaptAwsRuntime(closure), closure);
    const lambda = new Lambda(runtimeHandler, /* name */ `${this.id}-${description}-func`);

    this.testCases.push({
      description: description,
      testHandler: lambda.lambdaArn,
    });
  }

  public grantPermission(op: string, resource?: IResourceInfra) {
    op;
    resource;
    throw new Error("Method should be called.");
  }

  public postProcess(): void {
    this.outputs = pulumi.output({
      description: this.description,
      testCases: this.testCases,
    });
  }
}

/**
 * This function serves to bridge the gap between AWS runtime and Pluto, harmonizing their norms.
 * @param handler The HTTP path handler contains the business logic.
 */
function adaptAwsRuntime(__handler_: TestHandler): Handler {
  return async (_, context) => {
    const accountId = context.invokedFunctionArn.split(":")[4];
    process.env["AWS_ACCOUNT_ID"] = accountId;

    await __handler_();
  };
}
