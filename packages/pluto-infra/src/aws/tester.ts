import * as pulumi from "@pulumi/pulumi";
import { IResource, ResourceInfra } from "@plutolang/base";
import { TestCase, ITesterInfraApi, TesterInfraOptions } from "@plutolang/pluto";
import { Lambda } from "./lambda";

export class Tester extends pulumi.ComponentResource implements ITesterInfraApi, ResourceInfra {
  public readonly name: string;
  private readonly description: string;
  private readonly testCases: TestCase[];

  // eslint-disable-next-line
  public outputs: pulumi.Output<any>;

  constructor(description: string, props?: TesterInfraOptions) {
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
