import { FnResource, IResource, runtime, simulator } from "@plutolang/base";

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

export class Tester implements IResource {
  constructor(name: string, opts?: TesterOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: TesterOptions): TesterClient {
    const rtType = process.env["RUNTIME_TYPE"];
    switch (rtType) {
      case runtime.Type.Simulator:
        opts;
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, name);
      default:
        throw new Error(`not support this runtime '${rtType}'`);
    }
  }
}

export interface Tester extends TesterInfra, IResource {}
