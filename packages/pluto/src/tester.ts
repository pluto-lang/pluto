import {
  FnResource,
  IResource,
  IResourceClientApi,
  IResourceInfraApi,
  PlatformType,
  simulator,
  utils,
} from "@plutolang/base";

export interface TestCase {
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testHandler: any; // Not using pulumi.Output to avoid depending on pulumi.
}

export interface TestHandler extends FnResource {
  (): Promise<void>;
}

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface TesterOptions {}

/**
 * Don't export these methods to developers.
 * These methods are only used internally by the cli.
 */
export interface ITesterClientApi extends IResourceClientApi {
  listTests(): Promise<TestCase[]>;
  runTest(testCase: TestCase): Promise<void>;
}

export interface ITesterInfraApi extends IResourceInfraApi {
  it(description: string, fn: TestHandler): void;
}

export interface ITesterCapturedProps extends IResourceInfraApi {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type ITesterClient = ITesterClientApi & ITesterCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type ITesterInfra = ITesterInfraApi & ITesterCapturedProps;

export class Tester implements IResource {
  constructor(name: string, opts?: TesterOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: TesterOptions): ITesterClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.Simulator: {
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        const resourceId = utils.genResourceId(Tester.fqn, name);
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, resourceId);
      }
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
    opts;
  }

  public static fqn = "@plutolang/pluto.Tester";
}

export interface Tester extends IResource, ITesterClient, ITesterInfra {}
