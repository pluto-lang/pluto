import { ServerRequest, ServerResponse, SimulatorCleint } from "./interfaces";

const SIM_HANDLE_PATH = "/call";

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
