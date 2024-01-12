import * as pulumi from "@pulumi/pulumi";
import { IResource, ResourceInfra } from "@plutolang/base";
import { TestCase, ITesterInfra, TesterOptions } from "@plutolang/pluto";
import { Lambda } from "./function.lambda";

export class Tester extends pulumi.ComponentResource implements ResourceInfra, ITesterInfra {
  public readonly name: string;
  private readonly description: string;
  private readonly testCases: TestCase[];

  // eslint-disable-next-line
  public outputs: pulumi.Output<any>;

  constructor(description: string, props?: TesterOptions) {
    const name = description.replaceAll(/\s+/g, "");
    super("pluto:tester:aws/Tester", name, props);
    this.name = name;
    this.description = description;
    this.testCases = [];

    this.outputs = pulumi.output({});
  }

  public it(description: string, fn: IResource): void {
    if (!(fn instanceof Lambda)) {
      throw new Error("Tester.it only accepts Fn Resource.");
    }
    this.testCases.push({
      description: description,
      fnResourceId: (fn as Lambda).lambda.arn,
    });
  }

  public getPermission(op: string, resource?: ResourceInfra) {
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
