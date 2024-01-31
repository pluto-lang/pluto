import { simulator } from "@plutolang/base";
import { TestCase, ITesterClient, TesterOptions, TestHandler } from "@plutolang/pluto";
import { ComputeClosure, isComputeClosure } from "@plutolang/base/closure";

export class SimTester implements ITesterClient, simulator.IResourceInstance {
  readonly topicName: string;
  private testCases: TestCase[];

  constructor(name: string, opts?: TesterOptions) {
    this.topicName = name;
    this.testCases = [];
    opts;
  }

  public addEventHandler(op: string, args: any[]): void {
    if (op != "it") {
      throw new Error("Only 'it' is valid");
    }

    const description = args[0];
    const closure = args[1] as ComputeClosure<TestHandler>;
    if (!isComputeClosure(closure)) {
      throw new Error("The second argument of 'it' must be a closure");
    }
    this.testCases.push({ description, testHandler: closure });
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
    await testCase.testHandler();
  }
}
