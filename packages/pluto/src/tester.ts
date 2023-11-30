import { FnResource, Resource } from "@plutolang/base";

export interface TestCase {
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fnResourceId: any; // Not using pulumi.Output to avoid depending on pulumi.
}

export interface TestHandler extends FnResource {
  (): Promise<void>;
}

export interface TesterInfra {
  it(description: string, fn: TestHandler): void;
}

/**
 * Don't export these methods to developers.
 * These methods are only used internally by the cli.
 */
export interface TesterClient {
  listTests(): Promise<TestCase[]>;
  runTest(testCase: TestCase): Promise<void>;
}

export interface TesterInfraOptions {}

export interface TesterOptions extends TesterInfraOptions {}

export class Tester implements Resource {
  constructor(name: string, opts?: TesterOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }
}

export interface Tester extends TesterInfra, Resource {}
