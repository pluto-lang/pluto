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
    const envs: Record<string, string> = {
      PLUTO_PROJECT_NAME: this.project,
      PLUTO_STACK_NAME: this.stack.name,
      PLUTO_LANGUAGE_TYPE: this.language,
      PLUTO_PLATFORM_TYPE: this.stack.platformType,
      PLUTO_PROVISION_TYPE: this.stack.provisionType,
      WORK_DIR: this.stateDir,
    };

    let address: string | undefined;
    if (this.extraConfigs?.simulator) {
      address = this.extraConfigs.simulator.address;
    }

    this.simulator = new Simulator(this.rootpath, address);
    await this.simulator.start();
    envs.PLUTO_SIMULATOR_URL = this.simulator.serverUrl;

    for (const [key, value] of Object.entries(envs)) {
      process.env[key] = value;
    }

    const outputs = await this.simulator.loadApp(this.archRef);
    const awaitedOutputs = await awaitNestedPromises(outputs);

    return {
      outputs: {
        ...awaitedOutputs,
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

async function awaitNestedPromises<T>(obj: T): Promise<T> {
  for (const key in obj) {
    if (obj[key] instanceof Promise) {
      obj[key] = await obj[key];
    } else if (typeof obj[key] === "object") {
      obj[key] = await awaitNestedPromises(obj[key]);
    }
  }
  return obj;
}
