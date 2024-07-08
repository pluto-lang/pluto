import fs from "fs";
import http from "http";
import path from "path";
import { currentLanguage } from "@plutolang/base/utils";
import { LanguageType, arch, simulator } from "@plutolang/base";
import { ComputeClosure, AnyFunction, createClosure } from "@plutolang/base/closure";

const SIM_HANDLE_PATH = "/call";

export class Simulator {
  private readonly projectRoot: string;

  private resources: Map<string, simulator.IResourceInstance>;
  private closures: Map<string, ComputeClosure<AnyFunction>>;

  private _serverUrl?: string;
  private _server?: http.Server;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.resources = new Map();
    this.closures = new Map();

    const exitHandler = async () => {
      if (process.env.DEBUG) {
        console.log("Received SIGINT, stopping the simulator...");
      }
      await this.stop();
    };
    process.on("SIGINT", exitHandler);
    process.on("SIGTERM", exitHandler);
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
    const dotPos = resourceTypeFqn.lastIndexOf(".");
    const pkgName = resourceTypeFqn.substring(0, dotPos);
    const resourceType = resourceTypeFqn.substring(dotPos + 1);
    // TODO: check if the package exists, and import from user project
    const infraPkg = (await import(`${pkgName}-infra`)) as any;
    const resourceInfraClass = infraPkg[resourceType];
    if (!resourceInfraClass) {
      throw new Error(
        "Cannot find the infrastructure implementation class of the resource type " + resourceType
      );
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
    const requestHandler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
      if (!req.url?.startsWith(SIM_HANDLE_PATH)) {
        res.writeHead(404);
        res.end();
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        const request: simulator.ServerRequest = JSON.parse(body);
        const { resourceId, op, args } = request;
        if (process.env.DEBUG) {
          console.info(`Simulator: receive a request: ${resourceId}.${op}(${args})`);
        }

        // find the resource
        const resource = this.resources.get(resourceId);
        if (!resource) {
          throw new Error(`Resource ${resourceId} not found.`);
        }

        let result: any;
        try {
          // invoke the method
          result = (resource as any)[op](...args);
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          const replyError = err instanceof Error ? err : new Error(`${err}`);
          res.end(
            JSON.stringify({
              error: {
                message: replyError.message,
                stack: replyError.stack,
                name: replyError.name,
              },
            }),
            "utf-8"
          );
          return;
        }

        if (!(result instanceof Promise)) {
          // The called method is not async.
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ result }), "utf-8");
        } else {
          // The called method is async.
          result
            .then((result: any) => {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ result }), "utf-8");
            })
            .catch((err: any) => {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: {
                    message: err.message,
                    stack: err.stack,
                    name: err.name,
                  },
                }),
                "utf-8"
              );
            });
        }
      });
    };

    const server = http.createServer(requestHandler);
    await new Promise<void>((resolve) => {
      server!.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (addr && typeof addr === "object" && addr.port) {
          this._serverUrl = `http://${addr.address}:${addr.port}`;
        }
        this._server = server;
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    this._server?.close();
    this._server = undefined;
    this._serverUrl = undefined;
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
