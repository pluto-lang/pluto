import { join } from "path";
import { PlatformType, ProvisionType, core, errors } from "@plutolang/base";
import { Simulator } from "./simulator";

/**
 * TODO: Make the simulator a separate process.
 * Now, the simulator can only be used for testing purposes.
 * Additionally, the adapter is limited to use within one testing process and cannot be dumped.
 */
export class SimulatorAdapter extends core.Adapter {
  private simulator?: Simulator;

  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(join(__dirname, "../package.json")).version;

  constructor(args: core.NewAdapterArgs) {
    super(args);

    process.env.PLUTO_PROJECT_NAME = args.project;
    process.env.PLUTO_STACK_NAME = args.stack.name;
    process.env["PLUTO_PLATFORM_TYPE"] = PlatformType.Simulator;
    process.env["PLUTO_PROVISION_TYPE"] = ProvisionType.Simulator;
  }

  public async state(): Promise<core.StateResult> {
    throw new errors.NotImplementedError("The state of SimulatorAdapter has not implemented yet.");
  }

  public async deploy(): Promise<core.DeployResult> {
    this.simulator = new Simulator(this.rootpath);

    await this.simulator.start();
    process.env.PLUTO_SIMULATOR_URL = this.simulator.serverUrl;

    await this.simulator.loadApp(this.archRef);

    return {
      outputs: {
        simulatorServerUrl: this.simulator.serverUrl,
      },
    };
  }

  public async destroy(): Promise<void> {
    if (!this.simulator) {
      throw new Error("There is no simulator.");
    }
    await this.simulator.stop();
    return;
  }

  public dump(): string {
    throw new errors.NotImplementedError("The simulator adapter cannot be reused.");
  }

  public load(data: string): void {
    data;
    throw new errors.NotImplementedError("The simulator adapter cannot be reused.");
  }
}
