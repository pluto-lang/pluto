import { IResource, runtime, simulator } from "@plutolang/base";

export interface FunctionClient {
  invoke(payload: string): Promise<string>;
}

export interface FunctionOptions {}

export class Function implements IResource {
  constructor(name: string, opts?: FunctionOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: FunctionOptions): FunctionClient {
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

export interface Function extends FunctionClient, IResource {}
