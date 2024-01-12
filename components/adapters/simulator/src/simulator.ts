import { arch, simulator } from "@plutolang/base";
import http from "http";

const SIM_HANDLE_PATH = "/call";

export class Simulator implements simulator.IContext {
  private resources: Map<string, simulator.IResourceInstance>;
  private _serverUrl?: string;
  private _server?: http.Server;

  constructor() {
    this.resources = new Map();

    process.env["PLUTO_PLATFORM_TYPE"] = "SIMULATOR";
    process.env["PLUTO_PROVISION_TYPE"] = "simulator";
  }

  public async loadApp(archRef: arch.Architecture): Promise<void> {
    const pkgName = "@plutolang/pluto";
    const plutoInfra = await import(pkgName + "-infra");

    for (const resourceName in archRef.resources) {
      const resource = archRef.resources[resourceName];
      const resourceType = resource.type;
      if (resourceType === "Root") continue;

      const resourceInfraClass =
        resourceType === "FnResource" ? plutoInfra["Function"] : plutoInfra[resourceType];
      if (!resourceInfraClass) {
        throw new Error(
          "Cannot find the infrastructure implementation class of the resource type " + resourceType
        );
      }

      const args = new Array(resource.parameters.length);
      resource.parameters.forEach((param) => (args[param.index] = JSON.parse(param.value)));
      const instance = (await resourceInfraClass.createInstance(
        args[0],
        args[1]
      )) as simulator.IResourceInstance;
      await instance.setup(this);
      this.registerInstance(args[0], instance);
    }

    for (const relationship of archRef.relationships) {
      const fromResource = relationship.from;
      const toResource = relationship.to;
      if (fromResource.type === "Root") continue;
      if (relationship.type === arch.RelatType.ACCESS) continue;

      const fromResourceId = eval(fromResource.parameters.find((p) => p.index === 0)!.value);
      const toResourceId = eval(toResource.parameters.find((p) => p.index === 0)!.value);

      const args = new Array(relationship.parameters.length);
      relationship.parameters.forEach((param) => (args[param.index] = param.value));
      this.findInstance(fromResourceId).addEventHandler(
        relationship.operation,
        JSON.stringify(args),
        toResourceId
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
        const { resourceName, op, args } = request;
        const resource = this.resources.get(resourceName);

        if (!resource) {
          throw new Error(`Resource ${resourceName} not found.`);
        }

        (resource as any)
          [op](...args)
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
  }

  get serverUrl(): string {
    if (!this._serverUrl) {
      throw new Error("Simulator server is not running.");
    }

    return this._serverUrl;
  }

  public registerInstance(resourceName: string, instance: simulator.IResourceInstance): void {
    this.resources.set(resourceName, instance);
  }

  public findInstance(resourceName: string): simulator.IResourceInstance {
    if (!this.resources.has(resourceName)) {
      throw new Error(`Resource ${resourceName} not found`);
    }
    return this.resources.get(resourceName)!;
  }
}
