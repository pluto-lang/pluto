import path from "path";
import { Adapter, ApplyArgs, ApplyResult, DestroyArgs, DestroyResult } from "../adapter";
import { Simulator } from "./simulator";

export class SimulatorAdapter implements Adapter {
  private simulator?: Simulator;

  constructor() {}

  public async apply(args: ApplyArgs): Promise<ApplyResult> {
    if (!args.archRef || !args.outdir) {
      throw new Error("To use the simulator, you need to provide `archRef` and `outdir`.");
    }

    this.simulator = new Simulator();
    this.simulator.loadApp(args.archRef);

    process.env.WORK_DIR = path.join(args.outdir, "compiled");
    await this.simulator.start();

    return {
      outputs: {
        simulatorServerUrl: this.simulator.serverUrl,
      },
    };
  }

  public async destroy(args: DestroyArgs): Promise<DestroyResult> {
    if (!this.simulator) {
      throw new Error("There is no simulator.");
    }
    await this.simulator.stop();
    args;
    return {};
  }
}
