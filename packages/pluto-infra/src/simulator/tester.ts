import { simulator } from "@plutolang/base";
import { SimFunction } from "./function";
import { TestCase, TesterClient, TesterOptions } from "@plutolang/pluto";

export class SimTester implements TesterClient, simulator.IResourceInstance {
  readonly topicName: string;
  private testCases: TestCase[];
  private context?: simulator.IContext;

  constructor(name: string, opts?: TesterOptions) {
    this.topicName = name;
    this.testCases = [];
    opts;
  }

  public async setup(context: simulator.IContext) {
    this.context = context;
  }

  public addEventHandler(op: string, args: string, fnResourceId: string): void {
    if (op != "it") {
      throw new Error("Only 'it' is valid");
    }

    const description = JSON.parse(args)[0];
    this.testCases.push({ description, fnResourceId });
  }

  public async cleanup(): Promise<void> {}

  public async listTests(): Promise<TestCase[]> {
    return this.testCases;
  }

  public async runTest(testCase: TestCase): Promise<void> {
    await (this.context!.findInstance(testCase.fnResourceId) as SimFunction).invoke("");
  }
}
