import path from "path";
import { FnResource, sandbox, simulator } from "@plutolang/base";
import { IFunctionClientApi, FunctionOptions } from "@plutolang/pluto";

export class SimFunction implements simulator.IResourceInstance, IFunctionClientApi {
  private readonly entrypoint: string;
  private readonly opts?: FunctionOptions;
  private context?: simulator.IContext;

  constructor(name: string, opts?: FunctionOptions) {
    if (!process.env.WORK_DIR) {
      throw new Error("The WORK_DIR environment variable does not exist.");
    }

    this.entrypoint = path.join(process.env.WORK_DIR, name + ".js");
    this.opts = opts;
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
    const envs: Record<string, any> = {
      ...this.opts?.envs,
      PLUTO_SIMULATOR_URL: this.context!.serverUrl,
      PLUTO_PLATFORM_TYPE: "SIMULATOR",
    };

    const sb = new sandbox.Sandbox(this.entrypoint, {
      env: envs,
    });

    return await sb.call(payload);
  }
}
