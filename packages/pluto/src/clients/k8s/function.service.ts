import { createServer } from "net";
import { spawn } from "child_process";
import { genResourceId, getEnvValForProperty } from "@plutolang/base/utils";
import {
  AnyFunction,
  DEFAULT_FUNCTION_NAME,
  IFunctionClient,
  Function,
  DirectCallResponse,
} from "../../function";
import { genK8sResourceName } from "./utils";
import { InvokeError } from "../errors";

const isLocalMode = process.env.NODE_ENV === "local";

export class KnativeService<T extends AnyFunction> implements IFunctionClient<T> {
  private readonly id: string;

  private readonly serviceName: string;
  private readonly namespace: string;
  private readonly clusterIP?: string;
  private readonly port: number = 80;

  constructor(func: T, name?: string) {
    this.id = genResourceId(Function.fqn, name || DEFAULT_FUNCTION_NAME);
    this.serviceName = genK8sResourceName(this.id, "service");
    this.namespace = "default";
    if (!isLocalMode) {
      this.clusterIP = getEnvValForProperty(this.id, "clusterIP");
    }
    func;
  }

  public url(): string {
    throw new Error("The Knative service URL is currently not supported.");
  }

  public async invoke(...args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>> {
    try {
      if (isLocalMode) {
        return this.invokeLocal(...args);
      } else {
        return this.invokeCluster(...args);
      }
    } catch (e) {
      if (e instanceof InvokeError) {
        // Re-throw the InvokeError came from insied the user function.
        throw e;
      } else {
        console.error("Error calling Knative service function:", e);
        throw new Error(`The invocation of the Knative service '${this.id}' has failed.`);
      }
    }
  }

  /**
   * Invoke the function locally using kubectl's port-forwarding feature.
   */
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

  /**
   * Invoke the function in the container of the cluster.
   * @param args
   * @returns
   */
  private async invokeCluster(...args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>> {
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
      // The process of invoking the function is failed.
      throw new Error(`The response status code is ${response.status}.`);
    }

    const data: DirectCallResponse = await response.json();
    if (data.code === 200) {
      // The function is successfully executed.
      return data.body;
    } else {
      // The function is failed to execute.
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
          // The port-forwarding is ready.
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
