import { PlatformType, ProvisionType, arch, simulator } from "@plutolang/base";
import { ComputeClosure, AnyFunction, createClosure } from "@plutolang/base/closure";
import http from "http";
import path from "path";

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

    process.env["PLUTO_PLATFORM_TYPE"] = PlatformType.Simulator;
    process.env["PLUTO_PROVISION_TYPE"] = ProvisionType.Simulator;
  }

  public async loadApp(archRef: arch.Architecture): Promise<void> {
    // Ensure that a resource's dependencies are created before the resource itself, by establishing
    // the entities in a topological order.
    const entities = archRef.topoSort();
    for (const entity of entities) {
      if (entity instanceof arch.Resource) {
        const resource = await this.createResource(entity);
        this.resources.set(entity.id, resource);
      } else if (entity instanceof arch.Closure) {
        const closure = await this.createClosure(entity);
        this.closures.set(entity.id, closure);
      } else if (entity instanceof arch.Relationship) {
        await this.linkRelationship(entity);
      }
    }
  }

  private async createResource(resource: arch.Resource): Promise<simulator.IResourceInstance> {
    const resourceTypeFqn = resource.type;
    const dotPos = resourceTypeFqn.lastIndexOf(".");
    const pkgName = resourceTypeFqn.substring(0, dotPos);
    const resourceType = resourceTypeFqn.substring(dotPos + 1);
    // TODO: check if the package exists
    const infraPkg = (await import(`${pkgName}-infra`)) as any;
    const resourceInfraClass = infraPkg[resourceType];
    if (!resourceInfraClass) {
      throw new Error(
        "Cannot find the infrastructure implementation class of the resource type " + resourceType
      );
    }

    const args = new Array(resource.parameters.length);
    resource.parameters.forEach((param) => {
      if (param.type === "text") {
        args[param.index] = param.value === "undefined" ? undefined : eval(param.value);
      } else if (param.type === "closure") {
        args[param.index] = this.closures.get(param.value);
      }
    });
    return await resourceInfraClass.createInstance(...args);
  }

  private async createClosure(closure: arch.Closure): Promise<ComputeClosure<AnyFunction>> {
    const closurePath = path.join(this.projectRoot, closure.path);
    if (!closureExists(closurePath)) {
      throw new Error(`Closure ${closurePath} not found.`);
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const handler = require(closurePath).default;
    return createClosure(handler, {
      dirpath: closure.path,
    });
  }

  private async linkRelationship(relationship: arch.Relationship): Promise<void> {
    const from = relationship.from;
    if (relationship.type !== arch.RelatType.Create) return;
    if (from.type === "closure") return;

    const args = new Array(relationship.parameters.length);
    relationship.parameters.forEach((param) => {
      if (param.type === "text") {
        args[param.index] = param.value === "undefined" ? undefined : JSON.parse(param.value);
      } else if (param.type === "closure") {
        args[param.index] = this.closures.get(param.value);
      }
    });

    const resource = this.resources.get(from.id);
    if (!resource) {
      throw new Error(`Resource ${from.id} not found.`);
    }
    resource.addEventHandler(relationship.operation, args);
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
        if (addr && typeof addr === "object" && (addr as any).port) {
          this._serverUrl = `http://${addr.address}:${addr.port}`;
        }
        this._server = server;
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    this._server?.close();
    this._server?.closeAllConnections();
    this._server = undefined;
    this._serverUrl = undefined;
    for (const resource of this.resources.values()) {
      await resource.cleanup();
    }
  }

  get serverUrl(): string {
    if (!this._serverUrl) {
      throw new Error("Simulator server is not running.");
    }
    return this._serverUrl;
  }
}

function closureExists(closurePath: string): boolean {
  try {
    require.resolve(closurePath);
    return true;
  } catch (e) {
    return false;
  }
}
