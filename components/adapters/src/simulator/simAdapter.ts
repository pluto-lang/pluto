import path from "path";
import { core, errors } from "@plutolang/base";
import { Simulator } from "./simulator";

/**
 * TODO: Make the simulator a separate process.
 * Now, the simulator can only be used for testing purposes.
 * Additionally, the adapter is limited to use within one testing process and cannot be dumped.
 */
export class SimulatorAdapter extends core.Adapter {
  private simulator?: Simulator;

  constructor(args: core.NewAdapterArgs) {
    super(args);
  }

  public async state(): Promise<core.StateResult> {
    throw new errors.NotImplementedError("The state of SimulatorAdapter has not implemented yet.");
  }

  public async deploy(): Promise<core.DeployResult> {
    this.simulator = new Simulator();
    this.simulator.loadApp(this.archRef);

    process.env.WORK_DIR = path.join(this.workdir);
    await this.simulator.start();

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
