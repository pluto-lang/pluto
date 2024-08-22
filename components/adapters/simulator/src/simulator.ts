import fs from "fs";
import http from "http";
import path from "path";
import express from "express";
import { currentLanguage } from "@plutolang/base/utils";
import { LanguageType, arch, simulator } from "@plutolang/base";
import { ComputeClosure, AnyFunction, createClosure } from "@plutolang/base/closure";
import { MethodNotFound, ResourceNotFound } from "./errors";

export class Simulator {
  private readonly projectRoot: string;

  private resources: Map<string, simulator.IResourceInstance>;
  private closures: Map<string, ComputeClosure<AnyFunction>>;

  private _serverUrl?: string;
  private _server?: http.Server;

  private readonly exitHandler = async () => {};

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.resources = new Map();
    this.closures = new Map();

    this.exitHandler = async () => {
      if (process.env.DEBUG) {
        console.log("Received SIGINT, stopping the simulator...");
      }
      await this.stop();
    };

    process.on("SIGINT", this.exitHandler);
    process.on("SIGTERM", this.exitHandler);
  }

  public async loadApp(archRef: arch.Architecture) {
    // Ensure that a resource's dependencies are created before the resource itself, by establishing
    // the entities in a topological order.
    const entities = archRef.topoSort();
    for (const entity of entities) {
      switch (entity.type) {
        case arch.EntityType.Resource: {
          const resource = await this.createResource(entity.resource);
          this.resources.set(entity.resource.id, resource);
          break;
        }
        case arch.EntityType.Bundle: {
          const closure = await this.createClosure(entity.closure);
          this.closures.set(entity.closure.id, closure);
          break;
        }
        case arch.EntityType.Relationship: {
          await this.linkRelationship(entity.relationship);
        }
      }
    }

    const result: { [id: string]: any } = {};
    for (const entity of entities) {
      if (entity.type !== arch.EntityType.Resource) {
        continue;
      }
      const resource = this.resources.get(entity.resource.id);
      // Execute the postProcess function of the resource
      const postProcessFn = (resource as any)["postProcess"];
      if (postProcessFn) {
        await postProcessFn.call(resource);
      }

      // Collect the outputs of the resource.
      if ((resource as any).outputs) {
        result[entity.resource.id] = (resource as any).outputs;
      }
    }
    return result;
  }

  private async createResource(resource: arch.Resource): Promise<simulator.IResourceInstance> {
    const resourceTypeFqn = resource.type;

    const dotPos = resourceTypeFqn.indexOf(".");
    const pkgName = resourceTypeFqn.substring(0, dotPos);
    const resourceType = resourceTypeFqn.substring(dotPos + 1);

    const infraPkg = (await import(resolvePkg(`${pkgName}-infra`))) as any;
    const importLevels = resourceType.split(".");

    let resourceInfraClass: any;
    for (let i = 0; i < importLevels.length; i++) {
      resourceInfraClass = i == 0 ? infraPkg[importLevels[i]] : resourceInfraClass[importLevels[i]];

      if (!resourceInfraClass) {
        throw new Error(
          "Cannot find the infrastructure implementation class of the resource type " +
            resourceTypeFqn
        );
      }
    }

    const args = new Array(resource.arguments.length);
    resource.arguments.forEach((param) => {
      if (param.type === "text") {
        args[param.index] =
          param.value === "undefined" ? undefined : eval(`const v = ${param.value}; v`);
      } else if (param.type === "closure") {
        args[param.index] = this.closures.get(param.closureId);
      } else if (param.type === "capturedProperty") {
        args[param.index] = eval(arch.Argument.stringify(param));
      } else if (param.type === "resource") {
        const resource = this.resources.get(param.resourceId);
        if (!resource) {
          throw new Error(`Resource '${param.resourceId}' not found.`);
        }
        args[param.index] = resource;
      }
    });
    return await resourceInfraClass.createInstance(...args);
  }

  private async createClosure(closure: arch.Closure): Promise<ComputeClosure<AnyFunction>> {
    const closurePath = path.isAbsolute(closure.path)
      ? closure.path
      : path.join(this.projectRoot, closure.path);

    if (currentLanguage() === LanguageType.TypeScript) {
      if (!isValidJsModule(closurePath)) {
        throw new Error(`Closure '${closurePath}' is not a valid JS module.`);
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const handler = require(closurePath).default;
      return createClosure(handler, {
        dirpath: closure.path,
        exportName: "default",
      });
    } else if (currentLanguage() === LanguageType.Python) {
      if (!fs.existsSync(closurePath)) {
        throw new Error(`Closure '${closurePath}' not found.`);
      }
      return createClosure(() => {}, {
        dirpath: closure.path,
        exportName: "_default",
      });
    } else {
      throw new Error(`Unsupported language type: ${currentLanguage()}`);
    }
  }

  private async linkRelationship(relationship: arch.Relationship): Promise<void> {
    if (relationship.type !== arch.RelationshipType.Infrastructure) {
      return;
    }
    const from = relationship.caller;

    const args = new Array(relationship.arguments.length);
    for (const param of relationship.arguments) {
      let arg;
      switch (param.type) {
        case "text": {
          if (param.value === "undefined") {
            arg = undefined;
          } else if (isValidJson(param.value)) {
            arg = JSON.parse(param.value);
          } else if (param.value.startsWith("process.env")) {
            const regResult = /process.env\["(.*)"\]/g.exec(param.value);
            if (!regResult) {
              throw new Error(`Invalid value ${param.value}`);
            }
            arg = process.env[regResult[1]];
          }
          break;
        }
        case "capturedProperty": {
          // The parameter value is accessing a captured resource property.
          const resource = this.resources.get(param.resourceId);
          if (!resource) {
            throw new Error(`Resource '${param.resourceId}' not found.`);
          }
          arg = await (resource as any)[param.property]();
          break;
        }
        case "closure": {
          arg = this.closures.get(param.closureId);
          break;
        }
        case "resource": {
          const resource = this.resources.get(param.resourceId);
          if (!resource) {
            throw new Error(`Resource '${param.resourceId}' not found.`);
          }
          arg = resource;
          break;
        }
      }
      args[param.index] = arg;
    }

    const resource = this.resources.get(from.id);
    if (!resource) {
      throw new Error(`Resource ${from.id} not found.`);
    }

    const method = (resource as any)[relationship.operation];
    if (method) {
      await method.call(resource, ...args);
    } else {
      throw new Error(
        `Resource '${from.id}' does not have the method '${relationship.operation}'.`
      );
    }
  }

  public async start(): Promise<void> {
    const expressApp = this.createExpress();
    for (let port = 9001; ; port++) {
      const server = await tryListen(expressApp, port);
      if (server === undefined) {
        continue;
      }

      const addr = server.address();
      if (addr && typeof addr === "object" && addr.port) {
        this._serverUrl = `http://${addr.address}:${addr.port}`;
      }
      this._server = server;

      break;
    }
  }

  public async stop(): Promise<void> {
    this._server?.close();
    this._server = undefined;
    this._serverUrl = undefined;

    // Remove the exit handler to avoid too many listeners.
    process.off("SIGINT", this.exitHandler);
    process.off("SIGTERM", this.exitHandler);

    for (const resource of this.resources.values()) {
      try {
        await resource.cleanup();
      } catch (e: any) {
        console.error(`Error cleaning up resource: ${e.message}`);
      }
    }
  }

  get serverUrl(): string {
    if (!this._serverUrl) {
      throw new Error("Simulator server is not running.");
    }
    return this._serverUrl;
  }

  private createExpress() {
    const invokeAndReply = async (
      resourceId: string,
      method: string,
      args: any[],
      res: express.Response
    ) => {
      try {
        const result = await this.invokeMethod(resourceId, method, args);
        res.status(200).json({ result });
      } catch (err: any) {
        if (err instanceof MethodNotFound || err instanceof ResourceNotFound) {
          res.status(404).json({
            error: {
              message: err.message,
              stack: err.message,
              name: err.name,
            },
          });
        } else {
          const replyError = err instanceof Error ? err : new Error(`${err}`);
          res.status(500).json({
            error: {
              message: replyError.message,
              stack: replyError.stack,
              name: replyError.name,
            },
          });
        }
      }
    };

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.post("/call", async (req: express.Request, res: express.Response) => {
      const { resourceId, op, args } = req.body;
      await invokeAndReply(resourceId, op, args, res);
    });

    app.post("/:resourceId/:method", async (req: express.Request, res: express.Response) => {
      const { resourceId, method } = req.params;
      const args = req.body;
      await invokeAndReply(resourceId, method, args, res);
    });

    return app;
  }

  /**
   * Invokes a method on a resource instance. The resource Id can be a partial ID. But if multiple
   * resources are found for the given ID, an error is thrown.
   *
   * @param resourceId - The ID of the resource instance. It can be a partial ID.
   * @param method - The name of the method to invoke.
   * @param payload - An array of arguments to pass to the method.
   * @returns A promise that resolves to the result of the method invocation.
   * @throws {ResourceNotFound} If the resource instance with the given ID is not found.
   * @throws {Error} If multiple resource instances are found for the given ID.
   * @throws {MethodNotFound} If the method is not found on the resource instance.
   */
  private async invokeMethod(resourceId: string, method: string, payload: any[]): Promise<any> {
    let candidates: simulator.IResourceInstance[] = [];
    if (this.resources.has(resourceId)) {
      candidates = [this.resources.get(resourceId)!];
    } else {
      for (const [id, resource] of this.resources) {
        if (id.includes(resourceId) && typeof (resource as any)[method] === "function") {
          candidates.push(resource);
        }
      }
    }

    if (candidates.length === 0) {
      throw new ResourceNotFound(resourceId);
    }
    if (candidates.length > 1) {
      throw new Error(`Multiple resources were found for ${resourceId}`);
    }

    const methodFn = (candidates[0] as any)[method];
    if (typeof methodFn !== "function") {
      throw new MethodNotFound(method);
    }

    return methodFn.apply(candidates[0], payload);
  }
}

function isValidJsModule(closurePath: string): boolean {
  try {
    require.resolve(closurePath);
    return true;
  } catch (e) {
    return false;
  }
}

function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function resolvePkg(pkgName: string): string {
  try {
    const pkgPath = require.resolve(pkgName, { paths: [process.cwd(), __dirname] });
    return pkgPath;
  } catch (e) {
    throw new Error(`Cannot find package ${pkgName}`);
  }
}

async function tryListen(
  server: express.Express,
  port: number,
  hostname = "0.0.0.0"
): Promise<http.Server | undefined> {
  return new Promise((resolve) => {
    const httpServer = server.listen(port, hostname);

    httpServer.on("listening", () => {
      resolve(httpServer);
    });

    httpServer.on("error", (e) => {
      if (process.env.DEBUG) {
        console.error(`Failed to listen on port ${port}: ${e}`);
      }
      resolve(undefined);
    });
  });
}
