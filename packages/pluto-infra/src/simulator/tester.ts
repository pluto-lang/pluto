import { IResourceInfra } from "@plutolang/base";
import {
  TestCase,
  ITesterClient,
  TesterOptions,
  TestHandler,
  ITesterInfra,
  Tester,
} from "@plutolang/pluto";
import { ComputeClosure, isComputeClosure } from "@plutolang/base/closure";
import { genResourceId } from "@plutolang/base/utils";
import { SimFunction } from "./function";

export class SimTester implements IResourceInfra, ITesterClient, ITesterInfra {
  public readonly id: string;

  public readonly topicName: string;
  private readonly testCases: TestCase[];
  private readonly testFnMap: Record<string, SimFunction> = {};

  constructor(name: string, opts?: TesterOptions) {
    this.id = genResourceId(Tester.fqn, name);
    this.topicName = name;
    this.testCases = [];
    opts;
  }

  public it(description: string, closure: ComputeClosure<TestHandler>): void {
    if (!isComputeClosure(closure)) {
      throw new Error("The second argument of 'it' must be a closure");
    }
    this.testCases.push({ description, testHandler: closure });
    this.testFnMap[description] = new SimFunction(closure);
  }

  public async cleanup(): Promise<void> {}

  public async listTests(): Promise<TestCase[]> {
    return this.testCases;
  }

  public async runTest(req: TestCase): Promise<void> {
    const testCase = this.testCases.find((c) => c.description === req.description);
    if (testCase === undefined) {
      throw new Error(`Test case not found: ${req.description}`);
    }
    await this.testFnMap[req.description].invoke();
  }

  public grantPermission() {}
  public postProcess(): void {}
}
