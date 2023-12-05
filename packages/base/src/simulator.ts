const SIM_HANDLE_PATH = "/call";

export interface IResourceInstance {
  addEventHandler(op: string, args: string, fnResourceId: string): void;
  setup(context: IContext): Promise<void>;
  cleanup(): Promise<void>;
}

export interface IContext {
  get serverUrl(): string;
  findInstance(resourceName: string): IResourceInstance;
}

export interface ServerRequest {
  resourceName: string;
  op: string;
  args: any[];
}

export interface ServerResponse {
  readonly result?: any;
  readonly error?: any;
}

export type SimulatorCleint = any;

export function makeSimulatorClient(url: string, resourceName: string): SimulatorCleint {
  const get = (_target: any, op: string) => {
    return async function (...args: any[]) {
      const body: ServerRequest = { resourceName, op, args };
      const resp = await fetch(url + SIM_HANDLE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const parsed: ServerResponse = JSON.parse(await resp.text());

      if (parsed.error) {
        const err = new Error();
        err.message = parsed.error?.message;
        err.stack = parsed.error?.stack;
        err.name = parsed.error?.name;
        throw err;
      }
      return parsed.result;
    };
  };

  return new Proxy({}, { get });
}
