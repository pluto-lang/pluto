import path from "path";
import { FnResource, sandbox, simulator } from "@plutolang/base";
import { FunctionClient, FunctionOptions } from "@plutolang/pluto";

export class SimFunction implements simulator.IResourceInstance, FunctionClient {
  private readonly entrypoint: string;
  private context?: simulator.IContext;

  constructor(name: string, opts?: FunctionOptions) {
    if (!process.env.WORK_DIR) {
      throw new Error("The WORK_DIR environment variable does not exist.");
    }

    this.entrypoint = path.join(process.env.WORK_DIR, name + ".js");
    opts;
  }

  public async setup(context: simulator.IContext) {
    this.context = context;
  }

  public addEventHandler(op: string, args: string, handler: FnResource): void {
    op;
    args;
    handler;
    throw new Error("Method should not be called.");
  }

  public async cleanup(): Promise<void> {}

  public async invoke(payload: string): Promise<any> {
    const sb = new sandbox.Sandbox(this.entrypoint, {
      env: {
        PLUTO_SIMULATOR_URL: this.context!.serverUrl,
        RUNTIME_TYPE: "SIMULATOR",
      },
    });

    return await sb.call(payload);
  }
}
