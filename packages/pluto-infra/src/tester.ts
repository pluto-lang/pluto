import { engine, runtime, utils } from "@plutolang/base";
import { ITesterInfraApi, ITesterCapturedProps, TesterOptions } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

// Construct a type that includes all the necessary methods required to be implemented within
// the infrastructure class of a resource type.
type ITesterInfra = ITesterInfraApi & ITesterCapturedProps;

// Construct a type for a class constructor. The key point is that the parameters of the constructor
// must be consistent with the client class of this resource type. Use this type to ensure that
// all implementation classes have the correct and same constructor signature.
type TesterInfraImplClass = new (name: string, options?: TesterOptions) => ITesterInfra;

// Construct a map that contains all the implementation classes for this resource type.
// The final selection will be determined at runtime, and the class will be imported lazily.
const implClassMap = new ImplClassMap<ITesterInfra, TesterInfraImplClass>({
  [engine.Type.pulumi]: {
    [runtime.Type.AWS]: async () => (await import("./aws")).Tester,
  },
});

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and engine.
 */
export abstract class Tester {
  /**
   * Asynchronously creates an instance of the tester infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(name: string, options?: TesterOptions): Promise<ITesterInfra> {
    // TODO: ensure that the resource implementation class for the simulator has identical methods as those for the cloud.
    if (
      utils.currentPlatformType() === runtime.Type.Simulator &&
      utils.currentEngineType() === engine.Type.simulator
    ) {
      return new (await import("./simulator")).SimTester(name, options) as any;
    }

    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      name,
      options
    );
  }
}
