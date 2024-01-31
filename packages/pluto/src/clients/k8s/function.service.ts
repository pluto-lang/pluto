import { createServer } from "net";
import { spawn } from "child_process";
import { genResourceId, getEnvValForProperty } from "@plutolang/base/utils";
import {
  AnyFunction,
  DEFAULT_FUNCTION_NAME,
  IFunctionClient,
  Function,
  FunctionOptions,
  DirectCallResponse,
} from "../../function";
import { genK8sResourceName } from "./utils";

class InvokeError extends Error {}

const isLocalMode = process.env.NODE_ENV === "local";

export class KnativeService<T extends AnyFunction> implements IFunctionClient<T> {
  private readonly id: string;
  private readonly serviceName: string;
  private readonly namespace: string;
  private readonly clusterIP?: string;
  private readonly port: number = 80;

  constructor(func: T, opts?: FunctionOptions) {
    this.id = genResourceId(Function.fqn, opts?.name || DEFAULT_FUNCTION_NAME);
    this.serviceName = genK8sResourceName(this.id, "service");
    this.namespace = "default";
    if (!isLocalMode) {
      this.clusterIP = getEnvValForProperty(this.id, "clusterIP");
    }
    func;
  }

  public async invoke(...args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>> {
    try {
      if (isLocalMode) {
        return this.invokeLocal(...args);
      } else {
        return this.invokeRemote(...args);
      }
    } catch (e) {
      if (e instanceof InvokeError) {
        // Re-throw the InvokeError came from insied the user function.
        throw e;
      } else {
        console.error(e);
        throw new Error(`The invocation of the Knative service '${this.id}' has failed.`);
      }
    }
  }

  private async invokeLocal(...args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>> {
    const portForward = new KubectlPortForwardProcess();
    const port = await findAvailablePort();
    try {
      await portForward.start(this.serviceName, this.namespace, port, this.port);
      return await this.request(`http://localhost:${port}`, args);
    } finally {
      portForward.stop();
    }
  }

  private async invokeRemote(...args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>> {
    if (!this.clusterIP) {
      throw new Error(`The cluster IP of the Knative service '${this.id}' is not available.`);
    }
    return await this.request(`http://${this.clusterIP}:${this.port}`, args);
  }

  private async request(url: string, args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });

    if (response.status !== 200) {
      throw new Error(`The response status code is ${response.status}.`);
    }

    const data: DirectCallResponse = await response.json();
    if (data.statusCode === 200) {
      return data.body;
    } else {
      throw new InvokeError(data.body);
    }
  }
}

class KubectlPortForwardProcess {
  private process?: any;

  public async start(
    serviceName: string,
    namespace: string,
    localPort: number,
    remotePort: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(
        "kubectl",
        ["port-forward", `svc/${serviceName}`, `${localPort}:${remotePort}`, "-n", namespace],
        { detached: true }
      );

      this.process.stdout.on("data", (data: any) => {
        if (data.toString().includes("Forwarding from")) {
          resolve();
        }
      });

      this.process.stderr.on("data", (data: any) => {
        reject(data.toString());
      });

      this.process.on("close", (code: any) => {
        if (code !== 0) {
          reject(`kubectl port-forward exited with code ${code}`);
        }
      });
    });
  }

  public stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
  }
}

async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "string" ? 0 : address?.port;
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error("Failed to obtain the port."));
        }
      });
    });
  });
}
